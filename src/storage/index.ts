import channel from "@shared/channel/offscreen";
import { Options, getDefaultSettings } from "@fmg/options";
import {
    FMG_ImportAllHelper,
    ImportAllResult
} from "@fmg/storage/data/import-all";
import { FMG_LocalStorageDriver } from "@fmg/storage/drivers/local-storage";
import { FMG_Crypto } from "@fmg/storage/crypto";
import { FMG_GitHubSync } from "@fmg/storage/data/github-sync";
import { FMG_DataManager, FileExportData } from "@fmg/storage/data-manager";
import { FMG_SlotMigrator } from "@fmg/storage/migration/slot-migration";
import { GlobalSlot } from "@fmg/storage/global-slots";

declare global {
    export interface OffscreenChannel {
        has(data: { key: string }): boolean;
        get(data: { key: string; dflt?: string }): string | null;
        set(data: { key: string; value: string }): void;
        remove(data: { key: string }): void;
        getBookmarks(): FMG.Extension.Bookmarks;
        setBookmarks(data: { bookmarks?: FMG.Extension.Bookmarks }): void;
        getSettings(): FMG.Extension.Settings;
        setSettings(data: { settings?: FMG.Extension.Settings }): void;
        getGithubToken(): Promise<string | null>;
        setGithubToken(data: { token: string | null }): Promise<void>;
        validateGithubToken(data: {
            token: string;
        }): Promise<FMG.Storage.GitHub.TokenValidationResult>;
        getLastSyncTime(): string | null;
        setLastSyncTime(data: { time: string | null }): void;
        getRateLimitStatus(): FMG.Storage.GitHub.RateLimitInfo | null;
        // Data operations
        getAllData(): Promise<FileExportData | undefined>;
        importAllData(data: {
            json: string;
            userId?: number;
        }): Promise<ImportAllResult>;
        mergeAllData(data: {
            json: string;
            userId?: number;
        }): Promise<ImportAllResult>;
        // Global slots
        getGlobalSlots(data: {
            userId: number;
        }): Promise<(GlobalSlot | null)[]>;
        saveGlobalSlot(data: {
            userId: number;
            slotId: number;
            name: string;
        }): Promise<{ success: boolean; message: string }>;
        loadGlobalSlot(data: {
            userId: number;
            slotId: number;
            targetUserId?: number;
            mode?: "overwrite" | "merge";
        }): Promise<{ success: boolean; message: string } & ImportAllResult>;
        deleteGlobalSlot(data: {
            userId: number;
            slotId: number;
        }): Promise<{ success: boolean; message: string }>;
        renameGlobalSlot(data: {
            userId: number;
            slotId: number;
            newName: string;
        }): Promise<{ success: boolean; message: string }>;
        // GitHub sync with slots
        syncDownloadToSlot(data: { token: string; userId: number }): Promise<{
            success: boolean;
            message: string;
            gistId?: string;
        }>;
    }
}

function getBookmarks() {
    const data = localStorage.getItem("fmg:data:bookmarks");
    if (data === null) return [];
    return JSON.parse(data) as FMG.Extension.Bookmarks;
}

function getSettings() {
    const data = localStorage.getItem("fmg:data:settings");
    if (data === null) return getDefaultSettings();
    return JSON.parse(data) as FMG.Extension.Settings;
}

channel.onMessage("has", ({ key }) => {
    return localStorage.getItem(key) !== null;
});

channel.onMessage("get", ({ key, dflt }) => {
    return localStorage.getItem(key) ?? dflt ?? null;
});

channel.onMessage("set", ({ key, value }) => {
    return localStorage.setItem(key, value);
});

channel.onMessage("remove", ({ key }) => {
    return localStorage.removeItem(key);
});

channel.onMessage("getBookmarks", () => {
    return getBookmarks();
});

channel.onMessage("setBookmarks", ({ bookmarks }) => {
    if (bookmarks === undefined || !bookmarks.length) {
        localStorage.removeItem("fmg:data:bookmarks");
    } else {
        localStorage.setItem("fmg:data:bookmarks", JSON.stringify(bookmarks));
    }
});

channel.onMessage("getSettings", () => {
    return getSettings();
});

channel.onMessage("setSettings", async ({ settings }) => {
    if (settings === undefined) {
        localStorage.removeItem("fmg:data:settings");
    } else {
        localStorage.setItem("fmg:data:settings", JSON.stringify(settings));
    }

    await channel.background.settingsChanged({
        settings: settings ?? getDefaultSettings()
    });
});

// Rate limit tracking in memory
let currentRateLimit: FMG.Storage.GitHub.RateLimitInfo | null = null;

channel.onMessage("getGithubToken", async () => {
    const encrypted = localStorage.getItem("fmg:github_token");
    if (!encrypted) return null;
    return await FMG_Crypto.decryptIfNeeded(encrypted);
});

channel.onMessage("setGithubToken", async ({ token }) => {
    if (token === null) {
        localStorage.removeItem("fmg:github_token");
    } else {
        const encrypted = await FMG_Crypto.encryptIfNeeded(token);
        localStorage.setItem("fmg:github_token", encrypted);
    }
});

channel.onMessage("validateGithubToken", async ({ token }) => {
    return await FMG_GitHubSync.validateToken(token);
});

channel.onMessage("getLastSyncTime", () => {
    return localStorage.getItem("fmg:last_sync_time");
});

channel.onMessage("setLastSyncTime", ({ time }) => {
    if (time === null) {
        localStorage.removeItem("fmg:last_sync_time");
    } else {
        localStorage.setItem("fmg:last_sync_time", time);
    }
});

channel.onMessage("getRateLimitStatus", () => {
    return currentRateLimit;
});

// Update rate limit from GitHub API response headers
export function updateRateLimitFromHeaders(headers: Headers): void {
    const limit = headers.get("X-RateLimit-Limit");
    const remaining = headers.get("X-RateLimit-Remaining");
    const reset = headers.get("X-RateLimit-Reset");

    if (limit && remaining && reset) {
        currentRateLimit = {
            limit: parseInt(limit),
            remaining: parseInt(remaining),
            resetTimestamp: parseInt(reset) * 1000 // Convert to milliseconds
        };
    }
}

channel.onMessage("getAllData", async () => {
    const driver = new FMG_LocalStorageDriver(window);
    const exportData = await FMG_DataManager.prototype.exportAllMaps.call({
        driver,
        window
    });
    return exportData;
});

channel.onMessage("importAllData", async ({ json, userId }) => {
    const driver = new FMG_LocalStorageDriver(window);
    return await FMG_ImportAllHelper.importAll(driver, json, userId);
});

channel.onMessage("mergeAllData", async ({ json, userId }) => {
    const driver = new FMG_LocalStorageDriver(window);
    return await FMG_ImportAllHelper.mergeAll(driver, json, userId);
});

// Global Slots Operations
channel.onMessage("getGlobalSlots", async ({ userId }) => {
    const dataManager = new FMG_DataManager(window, userId);
    return await dataManager.getAllSlots();
});

channel.onMessage("saveGlobalSlot", async ({ userId, slotId, name }) => {
    const dataManager = new FMG_DataManager(window, userId);
    return await dataManager.saveToSlot(slotId, name);
});

channel.onMessage(
    "loadGlobalSlot",
    async ({ userId, slotId, targetUserId, mode }) => {
        const dataManager = new FMG_DataManager(window, userId);
        return await dataManager.loadFromSlot(
            slotId,
            targetUserId,
            mode || "overwrite"
        );
    }
);

channel.onMessage("deleteGlobalSlot", async ({ userId, slotId }) => {
    const dataManager = new FMG_DataManager(window, userId);
    return await dataManager.deleteSlot(slotId);
});

channel.onMessage("renameGlobalSlot", async ({ userId, slotId, newName }) => {
    const dataManager = new FMG_DataManager(window, userId);
    return await dataManager.renameSlot(slotId, newName);
});

// GitHub sync to slot
channel.onMessage("syncDownloadToSlot", async ({ token, userId }) => {
    const dataManager = new FMG_DataManager(window, userId);
    const result = await dataManager.syncDownloadFromGitHub(token);

    if (result.syncResult.success && result.saveResult.success) {
        return {
            success: true,
            message: result.saveResult.message,
            gistId: result.syncResult.gistId
        };
    } else {
        return {
            success: false,
            message:
                result.syncResult.error ||
                result.saveResult.error ||
                "Unknown error",
            gistId: result.syncResult.gistId
        };
    }
});

async function init() {
    const url = new URL(window.location.href);
    if (
        url.hostname === "mapgenie.io" &&
        url.searchParams.get("fmg_storage") !== "1"
    ) {
        return;
    }

    channel.connect();
    channel.background.settingsChanged({ settings: getSettings() });

    logger.log("storage script loaded", window.location);

    // Check and run slot migration
    const slotMigrator = new FMG_SlotMigrator(window);
    if (await slotMigrator.hasLegacySlots()) {
        logger.log("Legacy slots detected, starting migration...");
        await slotMigrator.backupLegacySlots();
        const migrationResult = await slotMigrator.migrate();
        if (migrationResult.migrated > 0) {
            logger.log(
                `Slot migration completed: ${migrationResult.migrated} slots migrated`
            );
        }
        if (migrationResult.errors.length > 0) {
            logger.error("Slot migration errors:", migrationResult.errors);
        }
    }
}

init().catch(logger.error);
