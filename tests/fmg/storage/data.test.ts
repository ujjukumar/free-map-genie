import FMG_Data from "@fmg/storage/data";

describe("FMG_Data", () => {
    let driver: any;
    let keyData: any;

    beforeEach(() => {
        driver = {
            get: jest.fn(),
            set: jest.fn(),
            remove: jest.fn()
        };
        keyData = {
            gameId: 1,
            mapId: 10,
            userId: 100
        };
    });

    it("should initialize with default values", () => {
        const data = FMG_Data.new(keyData, driver);
        expect(data.locationIds).toEqual([]);
        expect(data.categoryIds).toEqual([]);
        expect(data.visibleCategoriesIds).toEqual([]);
        expect(data.notes).toEqual([]);
        expect(data.presets).toEqual([]);
        expect(data.presetOrder).toEqual([]);
        expect(data.isEmpty).toBe(true);
    });

    it("should update locations via proxy", () => {
        const data = FMG_Data.new(keyData, driver);
        data.locations[101] = true;
        expect(data.locations[101]).toBe(true);
        expect(data.locationIds).toContain(101);
        expect(data.isEmpty).toBe(false);

        data.locations[101] = false;
        expect(data.locations[101]).toBe(false);
        expect(data.locationIds).not.toContain(101);
        expect(data.isEmpty).toBe(true);
    });

    it("should update categories via proxy", () => {
        const data = FMG_Data.new(keyData, driver);
        data.categories[1] = true;
        expect(data.categories[1]).toBe(true);
        expect(data.categoryIds).toContain(1);
        expect(data.isEmpty).toBe(false);

        delete data.categories[1];
        expect(data.categories[1]).toBe(false);
        expect(data.categoryIds).not.toContain(1);
    });

    it("should load data from driver", async () => {
        const storedData = {
            locationIds: [101, 102],
            categoryIds: [1],
            visibleCategoriesIds: [2],
            notes: [{ id: 1, title: "Note" }],
            presets: [{ id: 1, title: "Preset" }],
            presetOrder: [1]
        };
        driver.get.mockResolvedValue(storedData);

        const data = FMG_Data.new(keyData, driver);
        await data.load();

        expect(data.locationIds).toEqual(expect.arrayContaining([101, 102]));
        expect(data.categoryIds).toEqual([1]);
        expect(data.visibleCategoriesIds).toEqual([2]);
        expect(data.notes.length).toBe(1);
        expect(data.presets.length).toBe(1);
        expect(data.presetOrder).toEqual([1]);
    });

    it("should save data to driver", async () => {
        const data = FMG_Data.new(keyData, driver);
        data.locations[101] = true;
        data.notes.push({ id: 1 } as any);

        await data.saveNow();

        expect(driver.set).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                locationIds: [101],
                notes: [{ id: 1 }]
            })
        );
    });

    it("should remove from driver if empty on save", async () => {
        const data = FMG_Data.new(keyData, driver);
        await data.saveNow();
        expect(driver.remove).toHaveBeenCalled();
    });

    it("should clear data", async () => {
        const data = FMG_Data.new(keyData, driver);
        await data.clear();
        expect(driver.remove).toHaveBeenCalledWith(data.key);
    });
});
