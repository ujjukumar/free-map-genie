import FMG_Keys from "./keys";
import { isEmpty } from "@shared/utils";
import { FMG_ExportAllHelper } from "./data/export-all";
import { FMG_ImportAllHelper, ImportAllResult } from "./data/import-all";
import { FMG_GlobalSlotManager, GlobalSlot } from "./global-slots";
import { FMG_GitHubSync, SyncResult } from "./data/github-sync";

export interface FileExportData {
    json: string;
    filename: string;
}

export interface DataOperationResult {
    success: boolean;
    message: string;
    error?: string;
}

export interface SlotOperationResult {
    success: boolean;
    slotId?: number;
    message: string;
    error?: string;
}

/**
 * Unified Data Manager
 *
 * Provides a single, consistent API for all data operations:
 * - Export (current map or all maps)
 * - Import (current map or all maps)
 * - GitHub Sync (upload/download)
 * - Global Slots (save/load/manage)
 *
 * Works consistently across popup and content script contexts.
 */
export class FMG_DataManager {
    private window: Window;
    private driver: FMG.Storage.Driver;
    private slotManager: FMG_GlobalSlotManager;

    constructor(window: Window, userId: number, onSlotUpdate?: () => void) {
        this.window = window;
        // Driver will be initialized asynchronously to avoid circular dependencies
        this.driver = this.createDriver();
        this.slotManager = new FMG_GlobalSlotManager(
            window,
            userId,
            onSlotUpdate
        );
    }

    private createDriver(): FMG.Storage.Driver {
        // Use dynamic import to avoid circular dependency
        // Note: This is synchronous for now, but the driver class is loaded
        // Return a proxy that will delegate to the actual driver once loaded
        const window = this.window;
        const storage = window.localStorage;

        return {
            init: async () => {},
            get: async <T>(key: string): Promise<T | null> => {
                const item = storage.getItem(key);
                return item ? JSON.parse(item) : null;
            },
            set: async <T>(key: string, value: T): Promise<void> => {
                storage.setItem(key, JSON.stringify(value));
            },
            remove: async (key: string): Promise<void> => {
                storage.removeItem(key);
            },
            clear: async (): Promise<void> => {
                storage.clear();
            },
            keys: async (): Promise<string[]> => {
                return Object.keys(storage);
            }
        };
    }

    // ==================== EXPORT OPERATIONS ====================

    /**
     * Export all maps data (v3 format).
     * Used for GitHub sync and full backups.
     */
    public async exportAllMaps(): Promise<FileExportData | undefined> {
        return await FMG_ExportAllHelper.exportAll(this.driver);
    }

    /**
     * Export current map data (v2 format).
     * Used for single-map backups.
     */
    public async exportCurrentMap(
        keyData: FMG.Storage.KeyData
    ): Promise<FileExportData | undefined> {
        const data = await this.driver.get<FMG.Storage.V2.StorageObject>(
            FMG_Keys.getV2Key(keyData)
        );

        if (isEmpty(data)) {
            return undefined;
        }

        const exportJson: FMG.Storage.V2.ExportedJson = {
            version: 2,
            gameId: parseInt(keyData.gameId as string),
            mapId: parseInt(keyData.mapId as string),
            userId: parseInt(keyData.userId as string),
            data
        };

        return {
            json: JSON.stringify(exportJson),
            filename: `fmg_game_${keyData.gameId}_map_${keyData.mapId}_${new Date().toISOString()}.json`
        };
    }

    /**
     * Save exported data to a file download.
     */
    public static saveToFile(data: FileExportData): void {
        const blob = new Blob([data.json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ==================== IMPORT OPERATIONS ====================

    /**
     * Import data from JSON string.
     * Auto-detects format (v2 single-map or v3 all-maps).
     */
    public async importFromJson(
        json: string,
        targetUserId?: number,
        mode: "overwrite" | "merge" = "overwrite"
    ): Promise<ImportAllResult> {
        if (mode === "merge") {
            return await FMG_ImportAllHelper.mergeAll(
                this.driver,
                json,
                targetUserId
            );
        } else {
            return await FMG_ImportAllHelper.importAll(
                this.driver,
                json,
                targetUserId
            );
        }
    }

    /**
     * Show file picker and return file content.
     */
    public static async showFilePicker(): Promise<string | undefined> {
        const input = document.createElement("input");
        input.style.display = "none";
        input.type = "file";
        input.accept = ".json";
        document.body.appendChild(input);
        input.click();

        return new Promise((resolve) => {
            input.onchange = async () => {
                const file = input.files?.[0];
                if (file) {
                    const text = await file.text();
                    resolve(text);
                } else {
                    resolve(undefined);
                }
                document.body.removeChild(input);
            };
        });
    }

    // ==================== GITHUB SYNC OPERATIONS ====================

    /**
     * Upload all maps to GitHub Gist.
     */
    public async syncUploadToGitHub(token: string): Promise<SyncResult> {
        const exportData = await this.exportAllMaps();
        if (!exportData) {
            return {
                success: false,
                error: "No data to sync"
            };
        }
        return await FMG_GitHubSync.upload(token, exportData.json);
    }

    /**
     * Download from GitHub Gist and save to Sync Slot.
     * This is the unified behavior - always goes to Sync Slot (slot 0).
     */
    public async syncDownloadFromGitHub(token: string): Promise<{
        syncResult: SyncResult;
        saveResult: SlotOperationResult;
    }> {
        // Find latest gist
        const latestGist = await FMG_GitHubSync.findLatest(token);
        if (!latestGist) {
            return {
                syncResult: {
                    success: false,
                    error: "No sync data found on GitHub"
                },
                saveResult: {
                    success: false,
                    message: "No data to save"
                }
            };
        }

        // Download data
        const json = await FMG_GitHubSync.download(token, latestGist.id);

        // Parse and validate
        let data: FMG.Storage.V2.ExportAllJson;
        try {
            const parsed = JSON.parse(json);
            if (parsed.version === 3) {
                data = parsed as FMG.Storage.V2.ExportAllJson;
            } else {
                // Convert v2 to v3 format
                data = {
                    version: 3,
                    exportDate: new Date().toISOString(),
                    maps: [
                        {
                            gameId: parsed.gameId,
                            mapId: parsed.mapId,
                            userId: parsed.userId,
                            data: parsed.data
                        }
                    ]
                };
            }
        } catch (e) {
            return {
                syncResult: {
                    success: false,
                    error: "Invalid sync data format"
                },
                saveResult: {
                    success: false,
                    message: "Failed to parse data"
                }
            };
        }

        // Save to Sync Slot
        try {
            await this.slotManager.saveToSyncSlot(data);
            return {
                syncResult: {
                    success: true,
                    gistId: latestGist.id
                },
                saveResult: {
                    success: true,
                    slotId: FMG_GlobalSlotManager.getSyncSlotId(),
                    message: "Downloaded to Sync Slot"
                }
            };
        } catch (e) {
            return {
                syncResult: {
                    success: true,
                    gistId: latestGist.id
                },
                saveResult: {
                    success: false,
                    message: "Downloaded but failed to save to slot",
                    error: e instanceof Error ? e.message : String(e)
                }
            };
        }
    }

    // ==================== GLOBAL SLOT OPERATIONS ====================

    /**
     * Get all slots.
     */
    public async getAllSlots(): Promise<(GlobalSlot | null)[]> {
        return await this.slotManager.getSlots();
    }

    /**
     * Save current state to a slot.
     * If keyData is provided, saves only that map. Otherwise saves all maps.
     */
    public async saveToSlot(
        slotId: number,
        name: string,
        keyData?: FMG.Storage.KeyData
    ): Promise<SlotOperationResult> {
        try {
            let exportData: FileExportData | undefined;

            if (keyData) {
                // Save only the specified map
                exportData = await this.exportCurrentMap(keyData);
            } else {
                // Save all maps
                exportData = await this.exportAllMaps();
            }

            if (!exportData) {
                return {
                    success: false,
                    message: "No data to save"
                };
            }

            let data: FMG.Storage.V2.ExportAllJson;
            const parsed = JSON.parse(exportData.json);

            if (parsed.version === 3) {
                data = parsed as FMG.Storage.V2.ExportAllJson;
            } else {
                // Convert v2 to v3 format
                data = {
                    version: 3,
                    exportDate: new Date().toISOString(),
                    maps: [
                        {
                            gameId: parsed.gameId,
                            mapId: parsed.mapId,
                            userId: parsed.userId,
                            data: parsed.data
                        }
                    ]
                };
            }

            await this.slotManager.saveSlot(slotId, name, data);

            return {
                success: true,
                slotId,
                message: `Saved to slot ${slotId}`
            };
        } catch (e) {
            return {
                success: false,
                message: "Failed to save slot",
                error: e instanceof Error ? e.message : String(e)
            };
        }
    }

    /**
     * Load data from a slot and import it.
     */
    public async loadFromSlot(
        slotId: number,
        targetUserId?: number,
        mode: "overwrite" | "merge" = "overwrite"
    ): Promise<SlotOperationResult & ImportAllResult> {
        try {
            const slotData = await this.slotManager.loadSlot(slotId);
            const json = JSON.stringify(slotData);

            const importResult = await this.importFromJson(
                json,
                targetUserId,
                mode
            );

            return {
                success: importResult.errors.length === 0,
                slotId,
                message:
                    importResult.errors.length === 0
                        ? `Loaded from slot ${slotId}`
                        : `Loaded with ${importResult.errors.length} errors`,
                ...importResult
            };
        } catch (e) {
            return {
                success: false,
                slotId,
                message: "Failed to load slot",
                error: e instanceof Error ? e.message : String(e),
                imported: 0,
                skipped: 0,
                errors: [e instanceof Error ? e.message : String(e)]
            };
        }
    }

    /**
     * Delete a slot.
     */
    public async deleteSlot(slotId: number): Promise<SlotOperationResult> {
        try {
            await this.slotManager.deleteSlot(slotId);
            return {
                success: true,
                slotId,
                message: `Deleted slot ${slotId}`
            };
        } catch (e) {
            return {
                success: false,
                slotId,
                message: "Failed to delete slot",
                error: e instanceof Error ? e.message : String(e)
            };
        }
    }

    /**
     * Rename a slot.
     */
    public async renameSlot(
        slotId: number,
        newName: string
    ): Promise<SlotOperationResult> {
        try {
            await this.slotManager.renameSlot(slotId, newName);
            return {
                success: true,
                slotId,
                message: `Renamed slot ${slotId}`
            };
        } catch (e) {
            return {
                success: false,
                slotId,
                message: "Failed to rename slot",
                error: e instanceof Error ? e.message : String(e)
            };
        }
    }

    /**
     * Check if a slot is the reserved Sync slot.
     */
    public static isSyncSlot(slotId: number): boolean {
        return FMG_GlobalSlotManager.isSyncSlot(slotId);
    }

    /**
     * Get the Sync slot ID.
     */
    public static getSyncSlotId(): number {
        return FMG_GlobalSlotManager.getSyncSlotId();
    }

    /**
     * Get the total number of slots.
     */
    public static getSlotCount(): number {
        return FMG_GlobalSlotManager.getSlotCount();
    }
}
