import FMG_Keys from "./keys";
import debounce from "@shared/debounce";
import { FMG_TIMING } from "@shared/constants";

type Prop = string | symbol;

function asId(prop: string | symbol): number {
    const id = Number(prop);
    if (Number.isNaN(id)) {
        throw new TypeError(`Property ${String(prop)} is not a number`);
    }
    return id;
}

class IdSetProxyHandler implements ProxyHandler<Set<number>> {
    private onChange: () => void;

    constructor(onChange: () => void) {
        this.onChange = onChange;
    }

    get(target: Set<number>, prop: Prop) {
        const id = asId(prop);
        return target.has(id);
    }

    set(target: Set<number>, prop: Prop, value: boolean) {
        const id = asId(prop);
        const has = target.has(id);
        if (value && !has) {
            target.add(id);
            this.onChange();
        } else if (!value && has) {
            target.delete(id);
            this.onChange();
        }
        return true;
    }

    deleteProperty(target: Set<number>, prop: Prop) {
        const id = asId(prop);
        if (target.has(id)) {
            target.delete(id);
            this.onChange();
        }
        return true;
    }

    has(target: Set<number>, prop: Prop) {
        const id = asId(prop);
        return target.has(id);
    }

    ownKeys(target: Set<number>): ArrayLike<Prop> {
        return [...target.values()].map(String);
    }

    public getOwnPropertyDescriptor(
        target: Set<number>,
        prop: Prop
    ): PropertyDescriptor | undefined {
        if (typeof prop === "string") {
            const id = asId(prop);
            return {
                value: target.has(id),
                enumerable: true,
                configurable: true
            };
        }
    }
}

function idSetAsDictByIdBoolean(
    set: Set<number>,
    onChange: () => void
): DictById<boolean> {
    return new Proxy(
        set,
        new IdSetProxyHandler(onChange)
    ) as unknown as DictById<boolean>;
}

export default class FMG_Data {
    public readonly keyData?: FMG.Storage.KeyData;
    public readonly driver?: FMG.Storage.Driver;
    public readonly key?: string;

    private _locationsSet: Set<number>;
    private _categoriesSet: Set<number>;
    private _visibleCategoriesSet: Set<number>;

    private _locationIds?: number[];
    private _categoryIds?: number[];
    private _visibleCategoriesIds?: number[];

    private _locations: DictById<boolean>;
    private _categories: DictById<boolean>;
    private _visibleCategories: DictById<boolean>;

    public notes: MG.Note[];
    public presets: MG.Preset[];
    public presetOrder: number[];

    private constructor(
        keyData?: FMG.Storage.KeyData,
        driver?: FMG.Storage.Driver
    ) {
        this.keyData = keyData;
        this.driver = driver;

        this.key = keyData ? FMG_Keys.getV2Key(keyData) : undefined;

        this._locationsSet = new Set();
        this._categoriesSet = new Set();
        this._visibleCategoriesSet = new Set();

        this._locations = idSetAsDictByIdBoolean(
            this._locationsSet,
            () => (this._locationIds = undefined)
        );
        this._categories = idSetAsDictByIdBoolean(
            this._categoriesSet,
            () => (this._categoryIds = undefined)
        );
        this._visibleCategories = idSetAsDictByIdBoolean(
            this._visibleCategoriesSet,
            () => (this._visibleCategoriesIds = undefined)
        );

        this.notes = [];
        this.presets = [];
        this.presetOrder = [];
    }

    public static new(key: FMG.Storage.KeyData, driver: FMG.Storage.Driver) {
        return new FMG_Data(key, driver);
    }

    public static empty() {
        return new FMG_Data();
    }

    public get locations() {
        return this._locations;
    }

    public set locations(newLocations: DictById<boolean>) {
        this._locationsSet = new Set(Object.keys(newLocations).map(Number));
        this._locations = idSetAsDictByIdBoolean(
            this._locationsSet,
            () => (this._locationIds = undefined)
        );
        this._locationIds = undefined;
    }

    public get categories() {
        return this._categories;
    }

    public set categories(newCategories: DictById<boolean>) {
        this._categoriesSet = new Set(Object.keys(newCategories).map(Number));
        this._categories = idSetAsDictByIdBoolean(
            this._categoriesSet,
            () => (this._categoryIds = undefined)
        );
        this._categoryIds = undefined;
    }

    public get visibleCategories() {
        return this._visibleCategories;
    }

    public set visibleCategories(newVisibleCategories: DictById<boolean>) {
        this._visibleCategoriesSet = new Set(
            Object.keys(newVisibleCategories).map(Number)
        );
        this._visibleCategories = idSetAsDictByIdBoolean(
            this._visibleCategoriesSet,
            () => (this._visibleCategoriesIds = undefined)
        );
        this._visibleCategoriesIds = undefined;
    }

    public get locationIds() {
        if (!this._locationIds) {
            this._locationIds = Array.from(this._locationsSet);
        }
        return this._locationIds;
    }

    public get categoryIds() {
        if (!this._categoryIds) {
            this._categoryIds = Array.from(this._categoriesSet);
        }
        return this._categoryIds;
    }

    public get visibleCategoriesIds() {
        if (!this._visibleCategoriesIds) {
            this._visibleCategoriesIds = Array.from(this._visibleCategoriesSet);
        }
        return this._visibleCategoriesIds;
    }

    public get isEmpty() {
        return (
            this._locationsSet.size +
                this._categoriesSet.size +
                this._visibleCategoriesSet.size +
                this.notes.length +
                this.presets.length <=
            0
        );
    }

    private debouncedSave = debounce(
        () => this.saveNow(),
        FMG_TIMING.STORAGE_SAVE_DEBOUNCE
    );

    public async save() {
        this.debouncedSave();
    }

    public async saveNow() {
        if (!this.key || !this.driver) return;

        const data: Partial<FMG.Storage.V2.StorageObject> = {};

        if (this._locationsSet.size) {
            data.locationIds = this.locationIds;
        }

        if (this._categoriesSet.size) {
            data.categoryIds = this.categoryIds;
        }

        if (this._visibleCategoriesSet.size) {
            data.visibleCategoriesIds = this.visibleCategoriesIds;
        }

        if (this.presets.length) {
            data.presets = this.presets;
            data.presetOrder = this.presetOrder;
        }

        if (this.notes.length) {
            data.notes = this.notes;
        }

        if (this.isEmpty) {
            await this.driver.remove(this.key);
        } else {
            await this.driver.set<FMG.Storage.V2.StorageObject>(this.key, data);
        }
    }

    /**
     * Validate loaded storage data structure
     */
    private validateData(
        data: any
    ): data is Partial<FMG.Storage.V2.StorageObject> {
        if (!data || typeof data !== "object") {
            return false;
        }

        // Validate locationIds if present
        if (
            data.locationIds !== undefined &&
            !Array.isArray(data.locationIds)
        ) {
            logger.warn("Invalid locationIds in storage data");
            return false;
        }

        // Validate categoryIds if present
        if (
            data.categoryIds !== undefined &&
            !Array.isArray(data.categoryIds)
        ) {
            logger.warn("Invalid categoryIds in storage data");
            return false;
        }

        // Validate visibleCategoriesIds if present
        if (
            data.visibleCategoriesIds !== undefined &&
            !Array.isArray(data.visibleCategoriesIds)
        ) {
            logger.warn("Invalid visibleCategoriesIds in storage data");
            return false;
        }

        // Validate notes if present
        if (data.notes !== undefined && !Array.isArray(data.notes)) {
            logger.warn("Invalid notes in storage data");
            return false;
        }

        // Validate presets if present
        if (data.presets !== undefined && !Array.isArray(data.presets)) {
            logger.warn("Invalid presets in storage data");
            return false;
        }

        // Validate presetOrder if present
        if (
            data.presetOrder !== undefined &&
            !Array.isArray(data.presetOrder)
        ) {
            logger.warn("Invalid presetOrder in storage data");
            return false;
        }

        return true;
    }

    public async load() {
        if (!this.key || !this.driver) return;

        const data = await this.driver.get<FMG.Storage.V2.StorageObject>(
            this.key
        );

        // Validate data before using it
        if (data && !this.validateData(data)) {
            logger.error(
                `Invalid storage data for key ${this.key}, skipping load`
            );
            return;
        }

        this._locationsSet = new Set(data?.locationIds ?? []);
        this._categoriesSet = new Set(data?.categoryIds ?? []);
        this._visibleCategoriesSet = new Set(data?.visibleCategoriesIds ?? []);

        this._locationIds = undefined;
        this._categoryIds = undefined;
        this._visibleCategoriesIds = undefined;

        this._locations = idSetAsDictByIdBoolean(
            this._locationsSet,
            () => (this._locationIds = undefined)
        );
        this._categories = idSetAsDictByIdBoolean(
            this._categoriesSet,
            () => (this._categoryIds = undefined)
        );
        this._visibleCategories = idSetAsDictByIdBoolean(
            this._visibleCategoriesSet,
            () => (this._visibleCategoriesIds = undefined)
        );

        this.notes = data?.notes ?? [];
        this.presets = data?.presets ?? [];
        this.presetOrder = data?.presetOrder ?? [];
    }

    public snapshot() {
        const data = new FMG_Data();
        data._locationsSet = new Set(this.locationIds);
        data._categoriesSet = new Set(this.categoryIds);
        data._visibleCategoriesSet = new Set(this.visibleCategoriesIds);

        data._locations = idSetAsDictByIdBoolean(
            data._locationsSet,
            () => (data._locationIds = undefined)
        );
        data._categories = idSetAsDictByIdBoolean(
            data._categoriesSet,
            () => (data._categoryIds = undefined)
        );
        data._visibleCategories = idSetAsDictByIdBoolean(
            data._visibleCategoriesSet,
            () => (data._visibleCategoriesIds = undefined)
        );

        data.notes = [];
        data.presets = [];
        data.presetOrder = [];

        return data;
    }

    public async clear() {
        if (!this.key || !this.driver) return;

        await this.driver.remove(this.key);
    }
}
