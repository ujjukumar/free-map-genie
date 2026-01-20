import { FMG_Storage } from "@fmg/storage";
import FMG_Data from "@fmg/storage/data";

describe("FMG_Storage", () => {
    it("should initialize with maps from window.mapData", () => {
        const window = createWindow();
        (window as any).isMini = true;
        const keyData: FMG.Storage.KeyData = {
            gameId: 1,
            userId: 1
        };

        const storage = new FMG_Storage(window, keyData);

        expect(storage.window).toBe(window);
        expect(storage.keyData).toBe(keyData);
        expect(Object.keys(storage.all).length).toBe(
            window.mapData.maps.length
        );
    });

    it("should initialize with only the current map if not mini", () => {
        const window = createWindow();
        (window as any).isMini = false;
        const keyData: FMG.Storage.KeyData = {
            gameId: 1,
            userId: 1
        };

        const storage = new FMG_Storage(window, keyData);

        expect(Object.keys(storage.all).length).toBe(1);
    });

    it("should return the correct data for the current map if user is logged in", () => {
        const window = createWindow();
        const keyData: FMG.Storage.KeyData = {
            gameId: 1,
            userId: 1,
            mapId: window.mapData.map.id
        };

        const storage = new FMG_Storage(window, keyData);

        expect(storage.data).toBeDefined();
        expect(storage.data.isEmpty).toBe(true);
    });

    it("should return empty data if user is not logged in", () => {
        const window = createWindow();
        (window as any).user = undefined;
        const keyData: FMG.Storage.KeyData = {
            gameId: 1,
            userId: 1
        };

        const storage = new FMG_Storage(window, keyData);

        expect(storage.data.isEmpty).toBe(true);
    });

    it("should load all data", async () => {
        const window = createWindow();
        const keyData: FMG.Storage.KeyData = {
            gameId: 1,
            userId: 1
        };

        const storage = new FMG_Storage(window, keyData);
        const dataInstances = Object.values(storage.all);
        dataInstances.forEach((data) => {
            jest.spyOn(data, "load").mockImplementation(async () => {});
        });

        await storage.load();

        dataInstances.forEach((data) => {
            expect(data.load).toHaveBeenCalledTimes(1);
        });
    });

    it("should save all data", async () => {
        const window = createWindow();
        const keyData: FMG.Storage.KeyData = {
            gameId: 1,
            userId: 1
        };

        const storage = new FMG_Storage(window, keyData);
        const dataInstances = Object.values(storage.all);
        dataInstances.forEach((data) => {
            jest.spyOn(data, "saveNow").mockImplementation(async () => {});
        });

        await storage.save();

        dataInstances.forEach((data) => {
            expect(data.saveNow).toHaveBeenCalledTimes(1);
        });
    });

    it("should clear current map data", async () => {
        const window = createWindow();
        const keyData: FMG.Storage.KeyData = {
            gameId: 1,
            userId: 1,
            mapId: window.mapData.map.id
        };

        const storage = new FMG_Storage(window, keyData);
        jest.spyOn(storage.data, "clear").mockImplementation(async () => {});

        await storage.clearCurrentMap();

        expect(storage.data.clear).toHaveBeenCalledTimes(1);
    });

    it("should not clear if user or mapData is missing", async () => {
        const window = createWindow();
        const keyData: FMG.Storage.KeyData = {
            gameId: 1,
            userId: 1,
            mapId: window.mapData.map.id
        };

        const storage = new FMG_Storage(window, keyData);
        const data = storage.data;
        const spy = jest
            .spyOn(data, "clear")
            .mockImplementation(async () => {});

        (window as any).user = undefined;
        await storage.clearCurrentMap();
        expect(spy).not.toHaveBeenCalled();

        (window as any).user = { id: 1 };
        (window as any).mapData = undefined;
        await storage.clearCurrentMap();
        expect(spy).not.toHaveBeenCalled();
    });
});
