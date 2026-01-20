import FMG_StorageDataMigrator from "@fmg/storage/migration";
import FMG_Keys from "@fmg/storage/keys";
import { FMG_GameData } from "@fmg/info";

jest.mock("@shared/channel/content", () => ({
    __esModule: true,
    default: {
        background: {
            game: jest.fn()
        }
    }
}));

describe("FMG_StorageDataMigrator", () => {
    let driver: any;
    let migrator: FMG_StorageDataMigrator;

    beforeEach(() => {
        driver = {
            get: jest.fn(),
            set: jest.fn(),
            remove: jest.fn(),
            clear: jest.fn(),
            keys: jest.fn()
        };
        migrator = new FMG_StorageDataMigrator(driver);
    });

    it("should check if migration is needed", async () => {
        jest.spyOn(
            migrator.legacy,
            "hasLegacyStorageObjects"
        ).mockResolvedValue(true);
        expect(await migrator.needsMigration()).toBe(true);

        jest.spyOn(
            migrator.legacy,
            "hasLegacyStorageObjects"
        ).mockResolvedValue(false);
        expect(await migrator.needsMigration()).toBe(false);
    });

    it("should clear old backups", async () => {
        const now = Date.now();
        const weekAgo = now - 1000 * 60 * 60 * 24 * 7 - 1000;
        const yesterday = now - 1000 * 60 * 60 * 24;

        driver.keys.mockResolvedValue([
            `some-key:fmg-backup:${weekAgo}`,
            `some-key:fmg-backup:${yesterday}`,
            `other-key`
        ]);

        await migrator.clearOldBackups();

        expect(driver.remove).toHaveBeenCalledWith(
            `some-key:fmg-backup:${weekAgo}`
        );
        expect(driver.remove).not.toHaveBeenCalledWith(
            `some-key:fmg-backup:${yesterday}`
        );
        expect(driver.remove).not.toHaveBeenCalledWith(`other-key`);
    });

    it("should migrate data correctly", async () => {
        const legacyData: any = {
            "legacy-key": {
                gameId: 1,
                userId: 1,
                global: { locations: [101, 201] },
                maps: {
                    "10": { categories: [1, 2] }
                }
            }
        };

        jest.spyOn(
            migrator.legacy,
            "hasLegacyStorageObjects"
        ).mockResolvedValue(true);
        jest.spyOn(migrator.legacy, "keys").mockResolvedValue(["legacy-key"]);
        jest.spyOn(migrator.legacy, "fetch").mockResolvedValue(legacyData);

        const mockGameData = {
            filterLocations: jest.fn().mockReturnValue({
                "10": [101],
                "20": [201]
            })
        };
        jest.spyOn(FMG_GameData, "get").mockResolvedValue(mockGameData as any);

        driver.get.mockResolvedValue(legacyData["legacy-key"]);

        await migrator.migrate();

        expect(driver.set).toHaveBeenCalledWith(
            FMG_Keys.getLatestKey({ mapId: "10", gameId: 1, userId: 1 }),
            { locationIds: [101], categoryIds: [1, 2] }
        );
        expect(driver.set).toHaveBeenCalledWith(
            FMG_Keys.getLatestKey({ mapId: "20", gameId: 1, userId: 1 }),
            { locationIds: [201] }
        );

        expect(driver.set).toHaveBeenCalledWith(
            expect.stringContaining("legacy-key:fmg-backup:"),
            legacyData["legacy-key"]
        );
        expect(driver.remove).toHaveBeenCalledWith("legacy-key");
    });
});
