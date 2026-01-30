import { FMG_LocalStorageDriver } from "../drivers/local-storage";
import FMG_Keys from "../keys";
import { FMG_GlobalSlotManager } from "../global-slots";

/**
 * Interface for old per-map slot structure
 */
interface LegacySlot {
    id: number;
    name: string;
    date: string;
    count: number;
    data: FMG.Storage.V2.StorageObject;
}

/**
 * Migration helper to convert per-map slots to global slots
 */
export class FMG_SlotMigrator {
    private window: Window;
    private driver: FMG_LocalStorageDriver;

    constructor(window: Window) {
        this.window = window;
        this.driver = new FMG_LocalStorageDriver(window);
    }

    /**
     * Check if there are any legacy per-map slots that need migration
     */
    public async hasLegacySlots(): Promise<boolean> {
        const keys = await this.driver.keys();
        return keys.some((key) => key.startsWith("fmg:slots:"));
    }

    /**
     * Get all legacy slot keys grouped by user
     */
    private async getLegacySlotKeys(): Promise<
        {
            userId: number;
            slotId: number;
            gameId: number;
            mapId: number;
            key: string;
        }[]
    > {
        const keys = await this.driver.keys();
        const slotKeys: ReturnType<
            typeof this.getLegacySlotKeys
        > extends Promise<infer T>
            ? T
            : never = [];

        // Pattern: fmg:slots:game_{gameId}:map_{mapId}:user_{userId}:slot_{slotId}
        const pattern =
            /^fmg:slots:game_(\d+):map_(\d+):user_(\d+):slot_(\d+)$/;

        for (const key of keys) {
            const match = pattern.exec(key);
            if (match) {
                slotKeys.push({
                    gameId: parseInt(match[1]),
                    mapId: parseInt(match[2]),
                    userId: parseInt(match[3]),
                    slotId: parseInt(match[4]),
                    key
                });
            }
        }

        return slotKeys;
    }

    /**
     * Migrate legacy per-map slots to global slots
     * Combines slots from different maps into unified slots
     */
    public async migrate(): Promise<{
        migrated: number;
        errors: string[];
    }> {
        const result = { migrated: 0, errors: [] as string[] };

        const legacyKeys = await this.getLegacySlotKeys();
        if (legacyKeys.length === 0) {
            return result;
        }

        logger.log(`Found ${legacyKeys.length} legacy slot entries to migrate`);

        // Group by user and slot ID
        const groupedByUser = this.groupByUser(legacyKeys);

        for (const [userIdStr, slots] of Object.entries(groupedByUser)) {
            const userId = parseInt(userIdStr);
            const slotManager = new FMG_GlobalSlotManager(this.window, userId);

            // Group by slot ID
            const groupedBySlotId = this.groupBySlotId(slots);

            for (const [slotIdStr, slotEntries] of Object.entries(
                groupedBySlotId
            )) {
                const slotId = parseInt(slotIdStr);

                try {
                    // Convert to v3 format (all-maps format)
                    const v3Data = await this.convertToV3Format(slotEntries);

                    // Get the most recent slot name and date
                    const firstSlot = await this.driver.get<LegacySlot>(
                        slotEntries[0].key
                    );
                    if (firstSlot) {
                        const newName =
                            slotId === 0
                                ? "GitHub Sync"
                                : `${firstSlot.name} (Migrated)`;

                        await slotManager.saveSlot(slotId, newName, v3Data);
                        result.migrated++;
                        logger.log(
                            `Migrated slot ${slotId} for user ${userId}`
                        );
                    }

                    // Remove legacy keys
                    for (const entry of slotEntries) {
                        await this.driver.remove(entry.key);
                    }
                } catch (e) {
                    const error = e instanceof Error ? e.message : String(e);
                    result.errors.push(
                        `Failed to migrate slot ${slotId} for user ${userId}: ${error}`
                    );
                }
            }
        }

        return result;
    }

    /**
     * Group slot entries by user ID
     */
    private groupByUser(
        entries: Awaited<ReturnType<typeof this.getLegacySlotKeys>>
    ): { [userId: number]: typeof entries } {
        const grouped: { [userId: number]: typeof entries } = {};
        for (const entry of entries) {
            if (!grouped[entry.userId]) {
                grouped[entry.userId] = [];
            }
            grouped[entry.userId].push(entry);
        }
        return grouped;
    }

    /**
     * Group slot entries by slot ID
     */
    private groupBySlotId(
        entries: Awaited<ReturnType<typeof this.getLegacySlotKeys>>
    ): { [slotId: number]: typeof entries } {
        const grouped: { [slotId: number]: typeof entries } = {};
        for (const entry of entries) {
            if (!grouped[entry.slotId]) {
                grouped[entry.slotId] = [];
            }
            grouped[entry.slotId].push(entry);
        }
        return grouped;
    }

    /**
     * Convert legacy slot entries (v2 format, single maps) to v3 format (all maps)
     */
    private async convertToV3Format(
        entries: Awaited<ReturnType<typeof this.getLegacySlotKeys>>
    ): Promise<FMG.Storage.V2.ExportAllJson> {
        const maps: FMG.Storage.V2.ExportedMapEntry[] = [];

        for (const entry of entries) {
            const legacySlot = await this.driver.get<LegacySlot>(entry.key);
            if (legacySlot) {
                maps.push({
                    gameId: entry.gameId,
                    mapId: entry.mapId,
                    userId: entry.userId,
                    data: legacySlot.data
                });
            }
        }

        return {
            version: 3,
            exportDate: new Date().toISOString(),
            maps
        };
    }

    /**
     * Backup legacy slots before migration
     */
    public async backupLegacySlots(): Promise<number> {
        const keys = await this.driver.keys();
        let backedUp = 0;

        for (const key of keys) {
            if (key.startsWith("fmg:slots:")) {
                const data = await this.driver.get(key);
                if (data) {
                    await this.driver.set(
                        `${key}:fmg-slot-backup:${Date.now()}`,
                        data
                    );
                    backedUp++;
                }
            }
        }

        return backedUp;
    }

    /**
     * Clean up old slot backups (older than 30 days)
     */
    public async cleanupOldBackups(): Promise<number> {
        const keys = await this.driver.keys();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        let cleaned = 0;

        const pattern = /^fmg:slots:.+:fmg-slot-backup:(\d+)$/;

        for (const key of keys) {
            const match = pattern.exec(key);
            if (match) {
                const timestamp = parseInt(match[1]);
                if (Date.now() - timestamp > thirtyDays) {
                    await this.driver.remove(key);
                    cleaned++;
                }
            }
        }

        return cleaned;
    }
}
