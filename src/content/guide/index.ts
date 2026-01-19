import { waitForCallback, waitForGlobals } from "@shared/async";
import { getElement, documentLoaded } from "@shared/dom";
import { FMG_TIMING } from "@shared/constants";

import { FMG_Map } from "@content/map";
import { FMG_ApiFilter } from "@fmg/filters/api-filter";
import { FMG_CheckboxManager } from "./checkbox-manager";

import setupApiFilter from "@content/filters/api-filter";

export interface FMG_GuideSetupResult {
    reload: () => Promise<void>;
}

export class FMG_Guide {
    public readonly window: Window;
    public readonly checkboxManager: FMG_CheckboxManager;

    private _miniMap?: FMG_Map;
    private _mapElement?: HTMLIFrameElement;
    private _mapLoadHandler?: () => Promise<void>;

    constructor(window: Window) {
        this.window = window;
        this.checkboxManager = new FMG_CheckboxManager(window);
    }

    public get user(): number | null {
        return this.miniMap.window.user?.id ?? null;
    }

    public get miniMap(): FMG_Map {
        if (!this._miniMap) throw new Error("Minimap not setup.");
        return this._miniMap;
    }

    public get mapElement(): HTMLIFrameElement {
        if (!this._mapElement) throw new Error("mapElement not setup.");
        return this._mapElement;
    }

    public async cleanupProAds() {
        getElement(
            "#button-upgrade",
            this.window,
            FMG_TIMING.ELEMENT_WAIT_TIMEOUT
        ).then((elem) => elem.remove());
        getElement(
            "blockquote",
            this.window,
            FMG_TIMING.ELEMENT_WAIT_TIMEOUT
        ).then((elem) => elem.remove());
    }

    private async waitForMapElementLoaded(): Promise<HTMLIFrameElement> {
        const mapElement = await getElement<HTMLIFrameElement>(
            "#sticky-map iframe",
            this.window,
            FMG_TIMING.GLOBAL_WAIT_TIMEOUT
        );
        await waitForCallback(
            () => !!mapElement.contentWindow,
            FMG_TIMING.GLOBAL_WAIT_TIMEOUT
        );
        await waitForGlobals(
            ["mapData"],
            mapElement.contentWindow!,
            FMG_TIMING.GLOBAL_WAIT_TIMEOUT
        );
        await documentLoaded(
            mapElement.contentWindow!,
            FMG_TIMING.GLOBAL_WAIT_TIMEOUT
        );
        return mapElement;
    }

    private async setupMinimap(): Promise<void> {
        this._miniMap = new FMG_Map(this.mapElement.contentWindow!);
        this._miniMap!.setup();
        this.checkboxManager.mapManager = this._miniMap!.mapManager;
        this._miniMap!.mapManager.on("fmg-location", (e) => {
            this.checkboxManager.mark(e.detail.id, e.detail.marked);
        });
    }

    private loadData(): void {
        if (this.miniMap.mapManager.window.mapData) {
            this.window.mapData =
                this.miniMap.window.mapData ??
                ({} as unknown as MG.Info.MapData);
            this.window.mapData!.maps = this.miniMap.window.mapData?.maps ?? [];
            this.window.game = this.miniMap.window.game;
        } else {
            throw new Error("Unable to find map data");
        }
    }

    public async reload(): Promise<void> {
        await this.miniMap.mapManager.reload();
        this.checkboxManager.reload();
    }

    /**
     * Setup the guide
     */
    public async setup(): Promise<void> {
        this._mapElement = await this.waitForMapElementLoaded();

        await this.setupMinimap();
        this.loadData();
        this.checkboxManager.reload();

        // Listen for src changes
        this._mapLoadHandler = async () => {
            await this.waitForMapElementLoaded();
            await this.setupMinimap();
            await this.miniMap.mapManager.reload();
        };
        this.mapElement.addEventListener("load", this._mapLoadHandler);

        // Wait for axios to load
        await waitForGlobals(["axios"], window, FMG_TIMING.GLOBAL_WAIT_TIMEOUT);

        // Cleanup pro ads, but don't wait for it
        this.cleanupProAds().catch((error) => {
            logger.debug("Failed to cleanup PRO ads:", error);
        });

        // Setup the api filter
        const apiFilter = FMG_ApiFilter.install(window);
        setupApiFilter(apiFilter, this.miniMap.mapManager);

        logger.log("Guide setup complete");
    }

    /**
     * Cleanup event listeners and resources
     */
    public cleanup(): void {
        if (this._mapLoadHandler && this._mapElement) {
            this._mapElement.removeEventListener("load", this._mapLoadHandler);
        }
    }
}
