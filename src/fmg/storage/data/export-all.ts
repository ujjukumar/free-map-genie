import FMG_Keys from "../keys";

export interface ExportAllData {
    json: string;
    filename: string;
}

export class FMG_ExportAllHelper {
    /**
     * Generates a filename for the all-data export
     */
    public static getFileName(): string {
        return `fmg_sync_all_${new Date().toISOString()}.json`;
    }

    /**
     * Exports all FMG storage data from all games/maps/users
     * @param driver The storage driver to use
     * @returns The exported data as JSON string and filename, or undefined if no data
     */
    public static async exportAll(
        driver: FMG.Storage.Driver
    ): Promise<ExportAllData | undefined> {
        const allKeys = await driver.keys();
        const v2Regex = FMG_Keys.getV2KeyMatch({});

        // Filter to only FMG V2 storage keys
        const fmgKeys = allKeys.filter((key) => v2Regex.test(key));

        if (fmgKeys.length === 0) {
            return undefined;
        }

        const maps: FMG.Storage.V2.ExportedMapEntry[] = [];

        for (const key of fmgKeys) {
            const match = v2Regex.exec(key);
            if (!match?.groups) continue;

            const { gameId, mapId, userId } = match.groups;
            const data = await driver.get<FMG.Storage.V2.StorageObject>(key);

            if (data) {
                maps.push({
                    gameId: parseInt(gameId),
                    mapId: parseInt(mapId),
                    userId: parseInt(userId),
                    data
                });
            }
        }

        if (maps.length === 0) {
            return undefined;
        }

        const exportJson: FMG.Storage.V2.ExportAllJson = {
            version: 3,
            exportDate: new Date().toISOString(),
            maps
        };

        return {
            json: JSON.stringify(exportJson),
            filename: this.getFileName()
        };
    }

    /**
     * Saves the exported data to a file (browser download)
     */
    public static async saveFile(data: ExportAllData): Promise<void> {
        const blob = new Blob([data.json], {
            type: "application/json"
        });

        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = data.filename;
        a.click();

        URL.revokeObjectURL(url);
    }
}
