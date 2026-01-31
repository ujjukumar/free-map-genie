import FMG_Data from "./data";
import FMG_Drivers from "./drivers";
import FMG_Keys from "./keys";

export class FMG_Storage {
    public readonly window: Window;

    public driver: FMG.Storage.Driver;
    public keyData: FMG.Storage.KeyData;

    private _data: Record<string, FMG_Data> = {};

    public constructor(window: Window, keyData: FMG.Storage.KeyData) {
        this.window = window;
        this.driver = FMG_Drivers.newLocalStorageDriver(window);

        this.keyData = keyData;

        if (this.window.mapData) {
            const maps = this.window.isMini
                ? this.window.mapData.maps
                : [this.window.mapData.map];

            this._data = Object.fromEntries(
                maps.map((map) => {
                    const keyData: FMG.Storage.KeyData = {
                        ...this.keyData,
                        mapId: map.id
                    };
                    return [
                        FMG_Keys.getV2Key(keyData),
                        FMG_Data.new(keyData, this.driver)
                    ] as const;
                })
            );
        }
    }

    public get data(): FMG_Data {
        if (this.window.user) {
            return this._data[FMG_Keys.getV2Key(this.keyData)];
        }
        return FMG_Data.empty();
    }

    public get all(): Record<string, FMG_Data> {
        return this._data;
    }

    /**
     * Loads the data from the storage.
     */
    public async load(): Promise<void> {
        await Promise.all(Object.values(this._data).map((data) => data.load()));
        logger.debug("Loaded storage", this._data);
    }

    /**
     * Saves the data to the storage.
     */
    public async save(): Promise<void> {
        await Promise.all(
            Object.values(this._data).map((data) => data.saveNow())
        );
        logger.debug("Saved storage", this._data);
    }

    /**
     * Clear the data from the storage.
     */
    public async clearCurrentMap(): Promise<void> {
        if (!this.window.user || !this.window.mapData) return;

        await this.data.clear();
    }
}
