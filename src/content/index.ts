import channel from "@shared/channel/content";

import { getPageType, type PageType } from "@fmg/page";
import { FMG_Map } from "./map";
import { FMG_Guide } from "./guide";
import { FMG_MapSelector } from "./map-selector";
import debounce from "@shared/debounce";
import { FMG_ImportHelper } from "@fmg/storage/data/import";
import { FMG_ExportHelper } from "@fmg/storage/data/export";
import { FMG_KeyDataHelper } from "@fmg/storage/helpers/key-data";
import FMG_StorageDriver from "@fmg/storage/drivers";

export interface State {
    user: string;
    type: PageType;
}

declare global {
    export interface ContentChannel {
        getState(): State;
    }
}

channel.connect();

function listenForRefocus(callback: () => void) {
    document.addEventListener(
        "visibilitychange",
        debounce(() => {
            switch (document.visibilityState) {
                case "visible":
                    callback();
                    logger.debug("refocused");
                    break;
            }
        }, 250)
    );
}

/**
 * Reload the page, but only if it has not been reloaded consecutively 3 times.
 */
function isReduxStoreDefined(): boolean {
    return !!window.store;
}

const state: State = {
    user: "n/a",
    type: "unknown"
};

function setState(newState: Partial<State>) {
    Object.entries(newState).forEach(([k, v]) => {
        state[k as keyof typeof newState] = v as never;
    });
}

/**
 * Itialize the content script
 */
async function init() {
    // Run code for according to page type
    const type = await getPageType(window);
    logger.debug("pageType:", type);
    switch (type) {
        case "map":
            const map = new FMG_Map(window);
            await map.setup();
            listenForRefocus(() => map.reload());

            setState({
                user: String(map.user),
                type
            });
            break;
        case "guide":
            const guide = new FMG_Guide(window);
            await guide.setup();
            listenForRefocus(() => guide.reload());

            setState({
                user: String(guide.user),
                type
            });
            break;
        case "map-selector":
            await FMG_MapSelector.setup(window);

            setState({ type });
            break;
        case "home":
            setState({ type });
            break;
        case "unknown":
            logger.warn(`Page type ${type}, not attaching content script`);
            break;
    }
}

channel.onMessage("getState", () => {
    return state;
});

channel.onMessage("importData", async () => {
    try {
        const keyData = FMG_KeyDataHelper.fromWindow(window);
        const driver = FMG_StorageDriver.newLocalStorageDriver(window);
        const json = await FMG_ImportHelper.showFilePicker();
        if (json) {
            await FMG_ImportHelper.import(driver, keyData, json);
            window.location.reload();
        }
    } catch (e) {
        logger.error("Failed to import data", e);
        throw e;
    }
});

channel.onMessage("exportData", async () => {
    try {
        const keyData = FMG_KeyDataHelper.fromWindow(window);
        const driver = FMG_StorageDriver.newLocalStorageDriver(window);
        const data = await FMG_ExportHelper.export(driver, keyData);
        if (data) {
            await FMG_ExportHelper.saveFile(data);
        }
    } catch (e) {
        logger.error("Failed to export data", e);
        throw e;
    }
});

channel.onMessage("clearData", async () => {
    try {
        if (window.fmgMapManager) {
            await window.fmgMapManager.storage.data.clear();
            window.location.reload();
        } else {
            // Fallback if map manager is not available but we have key data
            const keyData = FMG_KeyDataHelper.fromWindow(window);
            const driver = FMG_StorageDriver.newLocalStorageDriver(window);
            // We need to clear via driver directly if FMG_Data is not available instance
            // But FMG_Data.clear accesses properties.
            // Easier to just error if not available or assume we are not fully loaded.
            throw new Error("MapManager not available");
        }
    } catch (e) {
        logger.error("Failed to clear data", e);
        throw e;
    }
});

init().catch((err) => {
    window.postMessage({
        type: "fmg:error",
        error: err.message
    });
    logger.error("[CONTENT]", err);
});
