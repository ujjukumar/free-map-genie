import { FMG_LocalStorageDriver } from "./drivers/local-storage";

export interface GlobalSlot {
    id: number;
    name: string;
    date: string;
    mapCount: number;
    totalLocations: number;
    data: FMG.Storage.V2.ExportAllJson;
}

export class FMG_GlobalSlotManager {
    private static readonly SLOT_COUNT = 5;
    private static readonly SYNC_SLOT_ID = 0;
    private window: Window;
    private userId: number;
    private driver: FMG_LocalStorageDriver;
    private onUpdate?: () => void;

    constructor(window: Window, userId: number, onUpdate?: () => void) {
        this.window = window;
        this.userId = userId;
        this.driver = new FMG_LocalStorageDriver(window);
        this.onUpdate = onUpdate;
    }

    /**
     * Get the storage key for a specific slot.
     */
    private getSlotKey(slotId: number): string {
        return `fmg:global_slots:user_${this.userId}:slot_${slotId}`;
    }

    /**
     * Check if a slot is the reserved Sync slot.
     */
    public static isSyncSlot(slotId: number): boolean {
        return slotId === this.SYNC_SLOT_ID;
    }

    /**
     * Get all slots.
     */
    public async getSlots(): Promise<(GlobalSlot | null)[]> {
        const slots: (GlobalSlot | null)[] = [];
        for (let i = 0; i < FMG_GlobalSlotManager.SLOT_COUNT; i++) {
            const key = this.getSlotKey(i);
            const slot = await this.driver.get<GlobalSlot>(key);
            slots.push(slot || null);
        }
        return slots;
    }

    /**
     * Get a specific slot by ID.
     */
    public async getSlot(slotId: number): Promise<GlobalSlot | null> {
        const key = this.getSlotKey(slotId);
        return await this.driver.get<GlobalSlot>(key);
    }

    /**
     * Save data to a slot.
     */
    public async saveSlot(
        slotId: number,
        name: string,
        data: FMG.Storage.V2.ExportAllJson
    ): Promise<void> {
        if (slotId < 0 || slotId >= FMG_GlobalSlotManager.SLOT_COUNT) {
            throw new Error("Invalid slot ID");
        }

        // Calculate statistics
        const mapCount = data.maps.length;
        const totalLocations = data.maps.reduce(
            (sum, map) => sum + (map.data.locationIds?.length || 0),
            0
        );

        const slot: GlobalSlot = {
            id: slotId,
            name,
            date: new Date().toISOString(),
            mapCount,
            totalLocations,
            data
        };

        const key = this.getSlotKey(slotId);
        await this.driver.set(key, slot);
        this.onUpdate?.();
    }

    /**
     * Save current state to the Sync slot (slot 0).
     * This is used by GitHub sync operations.
     */
    public async saveToSyncSlot(
        data: FMG.Storage.V2.ExportAllJson
    ): Promise<void> {
        await this.saveSlot(
            FMG_GlobalSlotManager.SYNC_SLOT_ID,
            "GitHub Sync",
            data
        );
    }

    /**
     * Load data from a slot.
     */
    public async loadSlot(
        slotId: number
    ): Promise<FMG.Storage.V2.ExportAllJson> {
        const key = this.getSlotKey(slotId);
        const slot = await this.driver.get<GlobalSlot>(key);

        if (!slot) {
            throw new Error("Slot is empty");
        }

        return slot.data;
    }

    /**
     * Load data from the Sync slot.
     */
    public async loadSyncSlot(): Promise<FMG.Storage.V2.ExportAllJson> {
        return await this.loadSlot(FMG_GlobalSlotManager.SYNC_SLOT_ID);
    }

    /**
     * Delete a slot.
     */
    public async deleteSlot(slotId: number): Promise<void> {
        const key = this.getSlotKey(slotId);
        await this.driver.remove(key);
        this.onUpdate?.();
    }

    /**
     * Rename a slot (without updating data).
     */
    public async renameSlot(slotId: number, newName: string): Promise<void> {
        const key = this.getSlotKey(slotId);
        const slot = await this.driver.get<GlobalSlot>(key);

        if (!slot) {
            throw new Error("Cannot rename empty slot");
        }

        slot.name = newName;
        await this.driver.set(key, slot);
        this.onUpdate?.();
    }

    /**
     * Get the Sync slot ID.
     */
    public static getSyncSlotId(): number {
        return this.SYNC_SLOT_ID;
    }

    /**
     * Get the total number of slots.
     */
    public static getSlotCount(): number {
        return this.SLOT_COUNT;
    }
}
