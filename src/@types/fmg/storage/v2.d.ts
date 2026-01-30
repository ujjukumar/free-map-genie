declare namespace FMG {
    namespace Storage {
        namespace V2 {
            interface StorageObject {
                locationIds: number[];
                categoryIds: number[];
                notes: MG.Note[];
                presets: MG.Preset[];
                presetOrder: MG.PresetOrder;
                visibleCategoriesIds: number[];
                lastModified?: string;
            }

            interface ExportedJson {
                version: 2;
                gameId: number;
                mapId: number;
                userId: number;
                data: DeepPartial<StorageObject>;
            }

            /** Single map entry in the multi-map export format */
            interface ExportedMapEntry {
                gameId: number;
                mapId: number;
                userId: number;
                data: DeepPartial<StorageObject>;
            }

            /** Multi-map export format (version 3) for syncing all data */
            interface ExportAllJson {
                version: 3;
                exportDate: string;
                maps: ExportedMapEntry[];
            }
        }
    }
}
