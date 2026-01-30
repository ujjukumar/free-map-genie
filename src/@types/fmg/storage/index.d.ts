declare namespace FMG {
    namespace Storage {
        interface KeyData {
            gameId: Id;
            userId: Id;
            mapId: Id;
        }

        namespace GitHub {
            interface RateLimitInfo {
                limit: number;
                remaining: number;
                resetTimestamp: number;
            }

            interface TokenValidationResult {
                valid: boolean;
                hasGistScope: boolean;
                error?: string;
                rateLimit?: RateLimitInfo;
            }
        }

        /**
         * Global slot that stores all maps data (v3 format)
         */
        interface GlobalSlot {
            id: number;
            name: string;
            date: string;
            mapCount: number;
            totalLocations: number;
            data: V2.ExportAllJson;
        }

        namespace DataManager {
            interface FileExportData {
                json: string;
                filename: string;
            }

            interface SlotOperationResult {
                success: boolean;
                slotId?: number;
                message: string;
                error?: string;
            }
        }
    }
}
