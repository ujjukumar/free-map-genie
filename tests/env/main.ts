import { TestEnvironment } from "jest-environment-node";
import * as fs from "fs";
import * as path from "path";
import { JSDOM } from "jsdom";

export default class FMGTestEnvironment extends TestEnvironment {
    private _axiosMethods = ["get", "put", "post", "delete"];
    private _mg = this.readDataJsonFile<MGData>("mg.json");
    private _storage = {
        v1: this.readDataJsonFile<StorageData>("storage", "v1.json"),
        v2: this.readDataJsonFile<StorageData>("storage", "v2.json")
    };

    async setup() {
        await super.setup();
        this.global.__DEBUG__ = true;
        this.global.__VERSION__ = "3.0.0";
        this.global.__HOMEPAGE__ =
            "https://github.com/mcarper92/free-map-genie";
        this.global.logger = this.createLoggerProxy();
        this.global.createWindow = this.createWindow.bind(this);
        this.global.loadV1Storage = this.createStorageLoader("v1");
        this.global.loadV2Storage = this.createStorageLoader("v2");
    }

    private createWindow(): any {
        const dom = new JSDOM("", {
            url: "https://mapgenie.io/tarkov/maps/factory"
        });

        this.global.window = dom.window as any;

        this.global.localStorage = dom.window.localStorage;
        this.global.sessionStorage = dom.window.sessionStorage;

        (dom.window as any).logger = this.global.logger as LoggerMock;

        (dom.window as any).axios = this.createAxiosMock();

        (dom.window as any).axios.defaults = {
            baseURL: "https://mapgenie.io"
        };

        (dom.window as any).game = this._mg.game;
        (dom.window as any).user = this._mg.user;

        (dom.window as any).mapData = {
            maps: this._mg.maps,
            map: this._mg.maps.find(
                (m: { slug: string }) => m.slug === "factory"
            )!
        };

        return dom.window;
    }

    private createAxiosMock() {
        return Object.fromEntries(
            this._axiosMethods.map((method) => [
                method,
                this.moduleMocker?.fn(() => Promise.resolve(method))
            ])
        ) as any;
    }

    private createStorageLoader(version: keyof typeof this._storage) {
        const data = this._storage[version];
        return function () {
            if (!globalThis.localStorage)
                throw new Error("window.localStorage not defined");
            for (const [key, value] of Object.entries(data)) {
                globalThis.localStorage.setItem(key, JSON.stringify(value));
            }
        };
    }

    private readDataFile(...paths: string[]) {
        return fs.readFileSync(
            path.join(".", "tests", "env", "data", ...paths),
            "utf8"
        );
    }

    private readDataJsonFile<T>(...paths: string[]): T {
        return JSON.parse(this.readDataFile(...paths));
    }

    private createLoggerProxy() {
        let muted = true;
        return new Proxy(console, {
            get(_, prop) {
                if (prop === "mute") return () => (muted = true);
                if (prop === "unmute") return () => (muted = false);
                if (muted) return () => {};
                return console[prop as keyof typeof console];
            }
        }) as any;
    }
}

declare global {
    function createWindow(): Window;
    function loadV1Storage(): void;
    function loadV2Storage(): void;

    const logger: LoggerMock;
    const __DEBUG__: boolean;
    const __VERSION__: string;
    const __HOMEPAGE__: string;

    interface Window {
        logger: LoggerMock;

        axios: AxiosMock;

        game: GameMock;
        mapData: MapDataMock;
        user: UserMock;
    }
}
