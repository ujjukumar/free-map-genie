import FMG_Keys from "../keys";
import logger from "@fmg/logger";

type SingleMapJson = FMG.Storage.V2.ExportedJson;
type MultiMapJson = FMG.Storage.V2.ExportAllJson;
type AnyExportJson = SingleMapJson | MultiMapJson;

export interface ImportAllResult {
    imported: number;
    skipped: number;
    errors: string[];
}

export interface ConflictInfo {
    gameId: number;
    mapId: number;
    localLastModified: string;
    remoteLastModified: string;
    remoteUpdatedAt: string;
}

export class FMG_ImportAllHelper {
    /**
     * Imports data from either a single-map (v2) or multi-map (v3) export
     * Supports backward compatibility with v2 format
     *
     * @param driver The storage driver to use
     * @param json The JSON string to import
     * @returns Import result with counts and any errors
     */
    public static async importAll(
        driver: FMG.Storage.Driver,
        json: string,
        targetUserId?: number
    ): Promise<ImportAllResult> {
        const result: ImportAllResult = {
            imported: 0,
            skipped: 0,
            errors: []
        };

        let data: AnyExportJson;

        try {
            data = JSON.parse(json) as AnyExportJson;
        } catch {
            result.errors.push("Invalid JSON format");
            return result;
        }

        // Check version and handle accordingly
        if (data.version === 3) {
            // Multi-map format (v3)
            return this.importMultiMap(
                driver,
                data as MultiMapJson,
                targetUserId
            );
        } else if (data.version === 2) {
            // Single-map format (v2) - wrap in multi-map format
            return this.importSingleMap(
                driver,
                data as SingleMapJson,
                targetUserId
            );
        } else {
            result.errors.push(
                `Unknown export version: ${(data as any).version}`
            );
            return result;
        }
    }

    /**
     * Imports a single-map (v2) export with intelligent merging
     */
    private static async importSingleMap(
        driver: FMG.Storage.Driver,
        data: SingleMapJson,
        targetUserId?: number
    ): Promise<ImportAllResult> {
        const result: ImportAllResult = {
            imported: 0,
            skipped: 0,
            errors: []
        };

        try {
            const finalUserId = targetUserId ?? data.userId;

            logger.debug(
                `[importSingleMap] Importing map ${data.gameId}/${data.mapId} for user ${finalUserId}`
            );

            // Find ALL existing entries with the same gameId+mapId (ignoring userId)
            const keyPattern = FMG_Keys.getV2KeyMatchByGameAndMap(
                data.gameId,
                data.mapId
            );
            const allKeys = await driver.keys();
            const matchingKeys = allKeys.filter((key) => keyPattern.test(key));

            logger.debug(
                `[importSingleMap] Found ${matchingKeys.length} existing entries for ${data.gameId}/${data.mapId}`
            );

            // Load all existing data
            let mergedData: DeepPartial<FMG.Storage.V2.StorageObject> = {
                ...data.data
            };

            for (const existingKey of matchingKeys) {
                const existingData =
                    await driver.get<FMG.Storage.V2.StorageObject>(existingKey);
                if (existingData) {
                    logger.debug(
                        `[importSingleMap] Merging data from key: ${existingKey}`
                    );
                    mergedData = this.mergeStorageObjects(
                        existingData,
                        mergedData
                    );
                }
            }

            // Delete ALL old entries for this game+map combination
            for (const oldKey of matchingKeys) {
                logger.debug(`[importSingleMap] Deleting old key: ${oldKey}`);
                await driver.remove(oldKey);
            }

            // Save merged data with the target userId
            const targetKeyData: FMG.Storage.KeyData = {
                gameId: data.gameId,
                mapId: data.mapId,
                userId: finalUserId
            };
            const targetKey = FMG_Keys.getV2Key(targetKeyData);

            logger.debug(
                `[importSingleMap] Saving merged data to key: ${targetKey}`
            );
            await driver.set(targetKey, mergedData);
            result.imported = 1;

            logger.log(
                `[importSingleMap] Successfully imported and merged ${data.gameId}/${data.mapId} for user ${finalUserId}`
            );
        } catch (e) {
            logger.error(`[importSingleMap] Failed to import map: ${e}`);
            result.errors.push(
                `Failed to import map ${data.gameId}/${data.mapId}: ${e}`
            );
        }

        return result;
    }

    /**
     * Imports a multi-map (v3) export with intelligent merging
     */
    private static async importMultiMap(
        driver: FMG.Storage.Driver,
        data: MultiMapJson,
        targetUserId?: number
    ): Promise<ImportAllResult> {
        const result: ImportAllResult = {
            imported: 0,
            skipped: 0,
            errors: []
        };

        for (const mapEntry of data.maps) {
            try {
                const finalUserId = targetUserId ?? mapEntry.userId;

                logger.debug(
                    `[importMultiMap] Importing map ${mapEntry.gameId}/${mapEntry.mapId} for user ${finalUserId}`
                );

                // Find ALL existing entries with the same gameId+mapId (ignoring userId)
                const keyPattern = FMG_Keys.getV2KeyMatchByGameAndMap(
                    mapEntry.gameId,
                    mapEntry.mapId
                );
                const allKeys = await driver.keys();
                const matchingKeys = allKeys.filter((key) =>
                    keyPattern.test(key)
                );

                logger.debug(
                    `[importMultiMap] Found ${matchingKeys.length} existing entries for ${mapEntry.gameId}/${mapEntry.mapId}`
                );

                // Load all existing data
                let mergedData: DeepPartial<FMG.Storage.V2.StorageObject> = {
                    ...mapEntry.data
                };

                for (const existingKey of matchingKeys) {
                    const existingData =
                        await driver.get<FMG.Storage.V2.StorageObject>(
                            existingKey
                        );
                    if (existingData) {
                        logger.debug(
                            `[importMultiMap] Merging data from key: ${existingKey}`
                        );
                        mergedData = this.mergeStorageObjects(
                            existingData,
                            mergedData
                        );
                    }
                }

                // Delete ALL old entries for this game+map combination
                for (const oldKey of matchingKeys) {
                    logger.debug(
                        `[importMultiMap] Deleting old key: ${oldKey}`
                    );
                    await driver.remove(oldKey);
                }

                // Save merged data with the target userId
                const targetKeyData: FMG.Storage.KeyData = {
                    gameId: mapEntry.gameId,
                    mapId: mapEntry.mapId,
                    userId: finalUserId
                };
                const targetKey = FMG_Keys.getV2Key(targetKeyData);

                logger.debug(
                    `[importMultiMap] Saving merged data to key: ${targetKey}`
                );
                await driver.set(targetKey, mergedData);
                result.imported++;

                logger.log(
                    `[importMultiMap] Successfully imported and merged ${mapEntry.gameId}/${mapEntry.mapId} for user ${finalUserId}`
                );
            } catch (e) {
                logger.error(`[importMultiMap] Failed to import map: ${e}`);
                result.errors.push(
                    `Failed to import map ${mapEntry.gameId}/${mapEntry.mapId}: ${e}`
                );
            }
        }

        return result;
    }

    /**
     * Merges imported data with existing data instead of overwriting
     * This is useful for sync scenarios where you want to combine data
     */
    public static async mergeAll(
        driver: FMG.Storage.Driver,
        json: string,
        targetUserId?: number
    ): Promise<ImportAllResult> {
        const result: ImportAllResult = {
            imported: 0,
            skipped: 0,
            errors: []
        };

        let data: AnyExportJson;

        try {
            data = JSON.parse(json) as AnyExportJson;
        } catch {
            result.errors.push("Invalid JSON format");
            return result;
        }

        // Convert to multi-map format if needed
        let maps: FMG.Storage.V2.ExportedMapEntry[];
        if (data.version === 3) {
            maps = (data as MultiMapJson).maps;
        } else if (data.version === 2) {
            const singleMap = data as SingleMapJson;
            maps = [
                {
                    gameId: singleMap.gameId,
                    mapId: singleMap.mapId,
                    userId: singleMap.userId,
                    data: singleMap.data
                }
            ];
        } else {
            result.errors.push(
                `Unknown export version: ${(data as any).version}`
            );
            return result;
        }

        for (const mapEntry of maps) {
            try {
                const keyData: FMG.Storage.KeyData = {
                    gameId: mapEntry.gameId,
                    mapId: mapEntry.mapId,
                    userId: targetUserId ?? mapEntry.userId
                };

                const key = FMG_Keys.getV2Key(keyData);

                // Get existing data
                const existing =
                    await driver.get<FMG.Storage.V2.StorageObject>(key);

                if (existing) {
                    // Merge the data
                    const merged = this.mergeStorageObjects(
                        existing,
                        mapEntry.data
                    );
                    await driver.set(key, merged);
                } else {
                    // No existing data, just set
                    await driver.set(key, mapEntry.data);
                }

                result.imported++;
            } catch (e) {
                result.errors.push(
                    `Failed to merge map ${mapEntry.gameId}/${mapEntry.mapId}: ${e}`
                );
            }
        }

        return result;
    }

    /**
     * Merges two storage objects, combining arrays without duplicates
     */
    public static mergeStorageObjects(
        existing: DeepPartial<FMG.Storage.V2.StorageObject>,
        incoming: DeepPartial<FMG.Storage.V2.StorageObject>
    ): DeepPartial<FMG.Storage.V2.StorageObject> {
        return {
            // Merge location IDs (unique set)
            locationIds: [
                ...new Set([
                    ...(existing.locationIds ?? []),
                    ...(incoming.locationIds ?? [])
                ])
            ],
            // Merge category IDs (unique set)
            categoryIds: [
                ...new Set([
                    ...(existing.categoryIds ?? []),
                    ...(incoming.categoryIds ?? [])
                ])
            ],
            // Merge notes by ID (incoming overwrites existing)
            notes: this.mergeByStringId(
                existing.notes ?? [],
                incoming.notes ?? []
            ),
            // Merge presets by ID (incoming overwrites existing)
            presets: this.mergeByNumberId(
                existing.presets ?? [],
                incoming.presets ?? []
            ),
            // Use incoming preset order if available, else existing
            presetOrder: incoming.presetOrder ?? existing.presetOrder ?? [],
            // Merge visible categories (unique set)
            visibleCategoriesIds: [
                ...new Set([
                    ...(existing.visibleCategoriesIds ?? []),
                    ...(incoming.visibleCategoriesIds ?? [])
                ])
            ]
        };
    }

    /**
     * Merges arrays of objects with string 'id' property, incoming overwrites existing
     */
    private static mergeByStringId<T extends { id: string }>(
        existing: T[],
        incoming: T[]
    ): T[] {
        const map = new Map<string, T>();

        // Add existing items
        for (const item of existing) {
            map.set(item.id, item);
        }

        // Overwrite/add incoming items
        for (const item of incoming) {
            map.set(item.id, item);
        }

        return Array.from(map.values());
    }

    /**
     * Merges arrays of objects with number 'id' property, incoming overwrites existing
     */
    private static mergeByNumberId<T extends { id: number }>(
        existing: T[],
        incoming: T[]
    ): T[] {
        const map = new Map<number, T>();

        // Add existing items
        for (const item of existing) {
            map.set(item.id, item);
        }

        // Overwrite/add incoming items
        for (const item of incoming) {
            map.set(item.id, item);
        }

        return Array.from(map.values());
    }

    /**
     * Detects conflicts between local data and incoming remote data
     * A conflict occurs when remote data is older than local data by more than the threshold
     *
     * @param driver The storage driver
     * @param json The incoming JSON data
     * @param remoteUpdatedAt The Gist updated_at timestamp from GitHub
     * @param thresholdMs Time difference threshold in milliseconds (default: 5 minutes)
     * @returns Array of conflict information for maps with detected conflicts
     */
    public static async detectConflicts(
        driver: FMG.Storage.Driver,
        json: string,
        remoteUpdatedAt: string,
        thresholdMs: number = 5 * 60 * 1000
    ): Promise<ConflictInfo[]> {
        const conflicts: ConflictInfo[] = [];

        let data: AnyExportJson;
        try {
            data = JSON.parse(json) as AnyExportJson;
        } catch {
            return conflicts;
        }

        // Convert to multi-map format if needed
        let maps: FMG.Storage.V2.ExportedMapEntry[];
        if (data.version === 3) {
            maps = (data as MultiMapJson).maps;
        } else if (data.version === 2) {
            const singleMap = data as SingleMapJson;
            maps = [
                {
                    gameId: singleMap.gameId,
                    mapId: singleMap.mapId,
                    userId: singleMap.userId,
                    data: singleMap.data
                }
            ];
        } else {
            return conflicts;
        }

        const remoteDate = new Date(remoteUpdatedAt).getTime();

        for (const mapEntry of maps) {
            const keyData: FMG.Storage.KeyData = {
                gameId: mapEntry.gameId,
                mapId: mapEntry.mapId,
                userId: mapEntry.userId
            };

            const key = FMG_Keys.getV2Key(keyData);
            const existing =
                await driver.get<FMG.Storage.V2.StorageObject>(key);

            if (existing?.lastModified) {
                const localDate = new Date(existing.lastModified).getTime();
                const remoteMapDate = mapEntry.data.lastModified
                    ? new Date(mapEntry.data.lastModified).getTime()
                    : remoteDate;

                // Conflict if local is newer than remote by threshold
                if (localDate > remoteMapDate + thresholdMs) {
                    conflicts.push({
                        gameId: mapEntry.gameId,
                        mapId: mapEntry.mapId,
                        localLastModified: existing.lastModified,
                        remoteLastModified: mapEntry.data.lastModified
                            ? new Date(mapEntry.data.lastModified).toISOString()
                            : remoteUpdatedAt,
                        remoteUpdatedAt
                    });
                }
            }
        }

        return conflicts;
    }
}
