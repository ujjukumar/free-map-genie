import React from "react";
import channel from "@shared/channel/popup";
import { FMG_GitHubSync } from "@fmg/storage/data/github-sync";
import { FMG_SYNC } from "@shared/constants";
import { GlobalSlot } from "@fmg/storage/global-slots";

type TokenStatus = "none" | "valid" | "invalid" | "checking";

interface SlotInfo {
    slot: GlobalSlot | null;
    isSyncSlot: boolean;
}

export default function DataPage() {
    const [token, setToken] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [lastSync, setLastSync] = React.useState<string | null>(null);
    const [tokenLoaded, setTokenLoaded] = React.useState(false);
    const [tokenStatus, setTokenStatus] = React.useState<TokenStatus>("none");
    const [rateLimit, setRateLimit] =
        React.useState<FMG.Storage.GitHub.RateLimitInfo | null>(null);
    const [userId, setUserId] = React.useState<number | null>(null);

    // Slots state
    const [slots, setSlots] = React.useState<SlotInfo[]>([]);
    const [slotsLoading, setSlotsLoading] = React.useState(false);
    const [renamingSlot, setRenamingSlot] = React.useState<number | null>(null);
    const [newSlotName, setNewSlotName] = React.useState("");
    const [savingSlot, setSavingSlot] = React.useState<number | null>(null);
    const [saveSlotName, setSaveSlotName] = React.useState("");

    // Load token, last sync time, and slots on mount
    React.useEffect(() => {
        async function loadStoredData() {
            try {
                const [storedToken, storedSyncTime, rateLimitStatus, state] =
                    await Promise.all([
                        channel.offscreen.getGithubToken(),
                        channel.offscreen.getLastSyncTime(),
                        channel.offscreen.getRateLimitStatus(),
                        channel.content.getState()
                    ]);
                if (storedToken) setToken(storedToken);
                if (storedSyncTime) setLastSync(storedSyncTime);
                if (rateLimitStatus) setRateLimit(rateLimitStatus);

                const parsedUserId = parseInt(state.user);
                if (!isNaN(parsedUserId)) {
                    setUserId(parsedUserId);
                }

                setTokenLoaded(true);
            } catch (e) {
                logger.error("Failed to load stored data:", e);
                setTokenLoaded(true);
            }
        }
        loadStoredData();
    }, []);

    // Load slots when userId is available
    React.useEffect(() => {
        if (userId !== null) {
            loadSlots();
        }
    }, [userId]);

    async function loadSlots() {
        if (userId === null) return;

        setSlotsLoading(true);
        try {
            const slotData = await channel.offscreen.getGlobalSlots({ userId });
            const slotsWithInfo: SlotInfo[] = slotData.map((slot, index) => ({
                slot,
                isSyncSlot: index === 0
            }));
            setSlots(slotsWithInfo);
        } catch (e) {
            logger.error("Failed to load slots:", e);
            window.toastr.error("Failed to load slots");
        } finally {
            setSlotsLoading(false);
        }
    }

    async function saveToken(e: React.ChangeEvent<HTMLInputElement>) {
        const newToken = e.target.value;
        setToken(newToken);
        setTokenStatus("none");
        try {
            await channel.offscreen.setGithubToken({ token: newToken || null });
        } catch (e) {
            logger.error("Failed to save token:", e);
        }
    }

    async function validateToken() {
        if (!token) {
            window.toastr.warning("Please enter a token first");
            return;
        }
        setTokenStatus("checking");
        try {
            const result = await channel.offscreen.validateGithubToken({
                token
            });
            if (result.valid && result.hasGistScope) {
                setTokenStatus("valid");
                window.toastr.success("Token is valid with Gist scope!");
            } else if (result.valid && !result.hasGistScope) {
                setTokenStatus("invalid");
                window.toastr.warning("Token is valid but lacks Gist scope");
            } else {
                setTokenStatus("invalid");
                window.toastr.error(result.error || "Invalid token");
            }
            if (result.rateLimit) {
                setRateLimit(result.rateLimit);
            }
        } catch (e: any) {
            setTokenStatus("invalid");
            logger.error("Token validation failed:", e);
            window.toastr.error("Validation failed: " + e.message);
        }
    }

    function getTokenStatusIcon(): string {
        switch (tokenStatus) {
            case "valid":
                return "✅ ";
            case "invalid":
                return "❌ ";
            case "checking":
                return "⏳ ";
            default:
                return "";
        }
    }

    function formatRateLimit(): string | null {
        if (!rateLimit) return null;
        const now = Date.now();
        const resetIn = Math.max(
            0,
            Math.ceil((rateLimit.resetTimestamp - now) / 60000)
        );
        const isLow =
            rateLimit.remaining <= FMG_SYNC.RATE_LIMIT_CRITICAL_THRESHOLD;
        const isWarning =
            rateLimit.remaining <= FMG_SYNC.RATE_LIMIT_WARNING_THRESHOLD;

        if (rateLimit.remaining === 0) {
            return `⚠️ Rate limit exceeded (resets in ${resetIn}m)`;
        }
        if (isLow) {
            return `⚠️ ${rateLimit.remaining}/${rateLimit.limit} remaining (resets in ${resetIn}m)`;
        }
        if (isWarning) {
            return `⚡ ${rateLimit.remaining}/${rateLimit.limit} remaining (resets in ${resetIn}m)`;
        }
        return `${rateLimit.remaining}/${rateLimit.limit} remaining`;
    }

    async function importData() {
        try {
            await channel.content.importData();
        } catch (e: any) {
            logger.error("Failed to import data:", e);
            window.toastr.error("Failed to import data: " + e.message);
        }
    }

    async function exportData() {
        try {
            await channel.content.exportData();
        } catch (e: any) {
            logger.error("Failed to export data:", e);
            window.toastr.error("Failed to export data: " + e.message);
        }
    }

    async function clearData() {
        if (!confirm("Are you sure you want to clear all data?")) return;

        try {
            await channel.content.clearData();
        } catch (e: any) {
            logger.error("Failed to clear data:", e);
            window.toastr.error("Failed to clear data: " + e.message);
        }
    }

    async function syncUpload() {
        if (!token) {
            window.toastr.warning("Please enter a GitHub Token");
            return;
        }
        setLoading(true);
        try {
            // Get ALL data from all games/maps via offscreen
            const data = await channel.offscreen.getAllData();
            if (!data) {
                window.toastr.warning("No data found to sync");
                return;
            }

            const result = await FMG_GitHubSync.upload(token, data.json);

            if (result.success) {
                const syncTime = new Date().toISOString();
                setLastSync(syncTime);
                await channel.offscreen.setLastSyncTime({ time: syncTime });
                window.toastr.success("All data synced to GitHub Gist!");
                // Reload slots to show updated sync slot
                await loadSlots();
            } else {
                throw new Error(result.error);
            }
        } catch (e: any) {
            logger.error("Sync upload failed", e);
            window.toastr.error("Sync failed: " + e.message);
        } finally {
            setLoading(false);
        }
    }

    async function syncDownload() {
        if (!token) {
            window.toastr.warning("Please enter a GitHub Token");
            return;
        }
        if (
            !confirm(
                "This will download data to the Sync Slot (Slot 0). You can then load it from there. Continue?"
            )
        )
            return;

        if (userId === null) {
            window.toastr.error("User ID not available");
            return;
        }

        setLoading(true);
        try {
            const result = await channel.offscreen.syncDownloadToSlot({
                token,
                userId
            });

            if (result.success) {
                const syncTime = new Date().toISOString();
                setLastSync(syncTime);
                await channel.offscreen.setLastSyncTime({ time: syncTime });
                window.toastr.success("Downloaded to Sync Slot!");
                // Reload slots to show updated sync slot
                await loadSlots();
            } else {
                throw new Error(result.message);
            }
        } catch (e: any) {
            logger.error("Sync download failed", e);
            window.toastr.error("Download failed: " + e.message);
        } finally {
            setLoading(false);
        }
    }

    async function syncMerge() {
        if (!token) {
            window.toastr.warning("Please enter a GitHub Token");
            return;
        }
        if (
            !confirm(
                "This will download data from GitHub to the Sync Slot (Slot 0), then merge it with your current data.\nExisting items will be kept, new items will be added.\nContinue?"
            )
        )
            return;

        if (userId === null) {
            window.toastr.error("User ID not available");
            return;
        }

        setLoading(true);
        try {
            // First download to sync slot
            const downloadResult = await channel.offscreen.syncDownloadToSlot({
                token,
                userId
            });

            if (!downloadResult.success) {
                throw new Error(downloadResult.message);
            }

            // Then load from sync slot with merge mode
            const loadResult = await channel.offscreen.loadGlobalSlot({
                userId,
                slotId: 0,
                mode: "merge"
            });

            if (loadResult.success) {
                const syncTime = new Date().toISOString();
                setLastSync(syncTime);
                await channel.offscreen.setLastSyncTime({ time: syncTime });
                window.toastr.success("Successfully merged data from GitHub!");

                // Reload slots
                await loadSlots();

                // Reload page to apply changes
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                throw new Error(loadResult.message);
            }
        } catch (e: any) {
            logger.error("Sync merge failed", e);
            window.toastr.error("Merge failed: " + e.message);
        } finally {
            setLoading(false);
        }
    }

    async function importMapgenieAccount() {
        try {
            await channel.content.importMapgenieAccount();
            window.toastr.success("MapGenie account data imported!");
        } catch (e: any) {
            logger.error("Failed to import MapGenie account:", e);
            window.toastr.error("Import failed: " + e.message);
        }
    }

    // Slot management functions
    async function handleSaveToSlot(slotId: number) {
        if (userId === null) {
            window.toastr.error("User ID not available");
            return;
        }

        const name = saveSlotName.trim() || `Slot ${slotId}`;

        setLoading(true);
        try {
            const result = await channel.offscreen.saveGlobalSlot({
                userId,
                slotId,
                name
            });

            if (result.success) {
                window.toastr.success(result.message);
                setSavingSlot(null);
                setSaveSlotName("");
                await loadSlots();
            } else {
                throw new Error(result.message);
            }
        } catch (e: any) {
            logger.error("Failed to save slot:", e);
            window.toastr.error("Failed to save slot: " + e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleLoadFromSlot(
        slotId: number,
        mode: "overwrite" | "merge" = "overwrite"
    ) {
        if (userId === null) {
            window.toastr.error("User ID not available");
            return;
        }

        const slotInfo = slots[slotId];
        if (!slotInfo?.slot) {
            window.toastr.warning("Slot is empty");
            return;
        }

        const confirmMsg =
            mode === "merge"
                ? `Merge data from Slot ${slotId}? Existing items will be kept.`
                : `Load data from Slot ${slotId}? This will overwrite your current data.`;

        if (!confirm(confirmMsg)) return;

        setLoading(true);
        try {
            const result = await channel.offscreen.loadGlobalSlot({
                userId,
                slotId,
                mode
            });

            if (result.success) {
                window.toastr.success(result.message);

                if (result.imported > 0) {
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                }
            } else {
                throw new Error(result.message);
            }
        } catch (e: any) {
            logger.error("Failed to load slot:", e);
            window.toastr.error("Failed to load slot: " + e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDeleteSlot(slotId: number) {
        if (userId === null) {
            window.toastr.error("User ID not available");
            return;
        }

        const slotInfo = slots[slotId];
        if (!slotInfo?.slot) {
            window.toastr.warning("Slot is already empty");
            return;
        }

        if (!confirm(`Delete Slot ${slotId} "${slotInfo.slot.name}"?`)) return;

        setLoading(true);
        try {
            const result = await channel.offscreen.deleteGlobalSlot({
                userId,
                slotId
            });

            if (result.success) {
                window.toastr.success(result.message);
                await loadSlots();
            } else {
                throw new Error(result.message);
            }
        } catch (e: any) {
            logger.error("Failed to delete slot:", e);
            window.toastr.error("Failed to delete slot: " + e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleRenameSlot(slotId: number) {
        if (userId === null) {
            window.toastr.error("User ID not available");
            return;
        }

        const name = newSlotName.trim();
        if (!name) {
            window.toastr.warning("Please enter a name");
            return;
        }

        setLoading(true);
        try {
            const result = await channel.offscreen.renameGlobalSlot({
                userId,
                slotId,
                newName: name
            });

            if (result.success) {
                window.toastr.success(result.message);
                setRenamingSlot(null);
                setNewSlotName("");
                await loadSlots();
            } else {
                throw new Error(result.message);
            }
        } catch (e: any) {
            logger.error("Failed to rename slot:", e);
            window.toastr.error("Failed to rename slot: " + e.message);
        } finally {
            setLoading(false);
        }
    }

    function startRenaming(slotId: number, currentName: string) {
        setRenamingSlot(slotId);
        setNewSlotName(currentName);
    }

    function startSaving(slotId: number) {
        setSavingSlot(slotId);
        setSaveSlotName(`Slot ${slotId}`);
    }

    function cancelRenaming() {
        setRenamingSlot(null);
        setNewSlotName("");
    }

    function cancelSaving() {
        setSavingSlot(null);
        setSaveSlotName("");
    }

    function formatLastSync(dateStr: string | null): string {
        if (!dateStr) return "Never";
        try {
            const date = new Date(dateStr);
            return date.toLocaleString();
        } catch {
            return "Unknown";
        }
    }

    function formatSlotDate(dateStr: string): string {
        try {
            const date = new Date(dateStr);
            return date.toLocaleString();
        } catch {
            return "Unknown";
        }
    }

    function getSlotDisplayName(slotInfo: SlotInfo, index: number): string {
        if (slotInfo.isSyncSlot) {
            return "GitHub Sync";
        }
        return slotInfo.slot?.name || `Slot ${index}`;
    }

    return (
        <div className="fmg-data-page">
            <div className="fmg-group">
                <label>File Import/Export</label>
                <div className="fmg-data-buttons">
                    <button className="fmg-btn" onClick={importData}>
                        <i className="fmg-icon-upload" /> Import
                    </button>
                    <button className="fmg-btn" onClick={exportData}>
                        <i className="fmg-icon-download" /> Export
                    </button>
                    <button className="fmg-btn" onClick={clearData}>
                        <i className="fmg-icon-trash" /> Clear
                    </button>
                </div>
            </div>

            <hr />

            <div className="fmg-group">
                <label>GitHub Sync (All Maps)</label>
                <div className="fmg-token-input-group">
                    <input
                        type="password"
                        className="fmg-input"
                        placeholder="GitHub Personal Access Token (Gist scope)"
                        value={token}
                        onChange={saveToken}
                        disabled={!tokenLoaded}
                    />
                    <button
                        className="fmg-btn validate-btn"
                        onClick={validateToken}
                        disabled={!token || tokenStatus === "checking"}
                    >
                        {getTokenStatusIcon()}
                        {tokenStatus === "checking" ? "..." : "Validate"}
                    </button>
                </div>
                <div className="fmg-sync-info">
                    <span className="fmg-sync-status">
                        Last sync: {formatLastSync(lastSync)}
                    </span>
                    <a
                        href="https://github.com/settings/tokens/new?description=Free%20Map%20Genie%20Sync&scopes=gist"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fmg-token-link"
                    >
                        Create token
                    </a>
                </div>
                {rateLimit && (
                    <div className="fmg-rate-limit-info">
                        {formatRateLimit()}
                    </div>
                )}
                <div className="fmg-data-buttons">
                    <button
                        className="fmg-btn"
                        onClick={syncUpload}
                        disabled={loading || !token}
                    >
                        <i className="fmg-icon-upload-cloud" />{" "}
                        {loading ? "..." : "Upload"}
                    </button>
                    <button
                        className="fmg-btn"
                        onClick={syncDownload}
                        disabled={loading || !token}
                    >
                        <i className="fmg-icon-download-cloud" />{" "}
                        {loading ? "..." : "Download to Slot"}
                    </button>
                    <button
                        className="fmg-btn"
                        onClick={syncMerge}
                        disabled={loading || !token}
                    >
                        <i className="fmg-icon-download-cloud" />{" "}
                        {loading ? "..." : "Merge"}
                    </button>
                </div>
            </div>

            <hr />

            <div className="fmg-group">
                <label>Global Slots</label>
                <div className="fmg-slots-info">
                    Save and load different data sets. Slot 0 is reserved for
                    GitHub Sync.
                </div>
                {slotsLoading ? (
                    <div className="fmg-slots-loading">Loading slots...</div>
                ) : (
                    <div className="fmg-slots-list">
                        {slots.map((slotInfo, index) => (
                            <div
                                key={index}
                                className={`fmg-slot-item ${slotInfo.isSyncSlot ? "fmg-slot-sync" : ""} ${slotInfo.slot ? "fmg-slot-occupied" : "fmg-slot-empty"}`}
                            >
                                <div className="fmg-slot-header">
                                    <div className="fmg-slot-number">
                                        {index}
                                    </div>
                                    <div className="fmg-slot-name">
                                        {renamingSlot === index ? (
                                            <div className="fmg-slot-rename">
                                                <input
                                                    type="text"
                                                    className="fmg-input fmg-input-small"
                                                    value={newSlotName}
                                                    onChange={(e) =>
                                                        setNewSlotName(
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Slot name"
                                                />
                                                <div className="fmg-slot-rename-actions">
                                                    <button
                                                        className="fmg-btn fmg-btn-small"
                                                        onClick={() =>
                                                            handleRenameSlot(
                                                                index
                                                            )
                                                        }
                                                        disabled={loading}
                                                    >
                                                        ✓
                                                    </button>
                                                    <button
                                                        className="fmg-btn fmg-btn-small"
                                                        onClick={cancelRenaming}
                                                        disabled={loading}
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <span>
                                                {getSlotDisplayName(
                                                    slotInfo,
                                                    index
                                                )}
                                                {slotInfo.isSyncSlot && (
                                                    <span className="fmg-slot-badge">
                                                        SYNC
                                                    </span>
                                                )}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {savingSlot === index ? (
                                    <div className="fmg-slot-save">
                                        <input
                                            type="text"
                                            className="fmg-input fmg-input-small"
                                            value={saveSlotName}
                                            onChange={(e) =>
                                                setSaveSlotName(e.target.value)
                                            }
                                            placeholder="Enter slot name"
                                        />
                                        <div className="fmg-slot-save-actions">
                                            <button
                                                className="fmg-btn fmg-btn-small"
                                                onClick={() =>
                                                    handleSaveToSlot(index)
                                                }
                                                disabled={loading}
                                            >
                                                Save
                                            </button>
                                            <button
                                                className="fmg-btn fmg-btn-small"
                                                onClick={cancelSaving}
                                                disabled={loading}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : slotInfo.slot ? (
                                    <div className="fmg-slot-details">
                                        <div className="fmg-slot-stats">
                                            <span>
                                                {slotInfo.slot.mapCount} maps
                                            </span>
                                            <span>•</span>
                                            <span>
                                                {slotInfo.slot.totalLocations}{" "}
                                                locations
                                            </span>
                                        </div>
                                        <div className="fmg-slot-date">
                                            {formatSlotDate(slotInfo.slot.date)}
                                        </div>
                                        <div className="fmg-slot-actions">
                                            <button
                                                className="fmg-btn fmg-btn-small"
                                                onClick={() =>
                                                    handleLoadFromSlot(
                                                        index,
                                                        "overwrite"
                                                    )
                                                }
                                                disabled={loading}
                                                title="Load (overwrite current data)"
                                            >
                                                Load
                                            </button>
                                            {!slotInfo.isSyncSlot && (
                                                <>
                                                    <button
                                                        className="fmg-btn fmg-btn-small"
                                                        onClick={() =>
                                                            handleLoadFromSlot(
                                                                index,
                                                                "merge"
                                                            )
                                                        }
                                                        disabled={loading}
                                                        title="Merge with current data"
                                                    >
                                                        Merge
                                                    </button>
                                                    <button
                                                        className="fmg-btn fmg-btn-small"
                                                        onClick={() =>
                                                            startRenaming(
                                                                index,
                                                                slotInfo.slot!
                                                                    .name
                                                            )
                                                        }
                                                        disabled={loading}
                                                        title="Rename slot"
                                                    >
                                                        Rename
                                                    </button>
                                                    <button
                                                        className="fmg-btn fmg-btn-small fmg-btn-danger"
                                                        onClick={() =>
                                                            handleDeleteSlot(
                                                                index
                                                            )
                                                        }
                                                        disabled={loading}
                                                        title="Delete slot"
                                                    >
                                                        Delete
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="fmg-slot-empty-state">
                                        <span className="fmg-slot-empty-text">
                                            Empty slot
                                        </span>
                                        {!slotInfo.isSyncSlot && (
                                            <button
                                                className="fmg-btn fmg-btn-small"
                                                onClick={() =>
                                                    startSaving(index)
                                                }
                                                disabled={loading}
                                            >
                                                Save Current Data
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <hr />

            <button
                className="fmg-btn full-width"
                onClick={importMapgenieAccount}
            >
                Import MapGenie Account
            </button>
            <style>{`
                .fmg-data-page {
                    padding: 10px;
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                .fmg-group {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                .fmg-group label {
                    font-size: 12px;
                    color: #aaa;
                    text-transform: uppercase;
                    font-weight: bold;
                }
                .fmg-data-buttons {
                    display: flex;
                    gap: 5px;
                }
                .fmg-btn {
                    flex: 1;
                    padding: 8px;
                    background: #222;
                    color: #fff;
                    border: 1px solid #444;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                    transition: all 0.2s;
                }
                .fmg-btn:hover:not(:disabled) {
                    background: #333;
                }
                 .fmg-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .fmg-btn-small {
                    padding: 4px 8px;
                    font-size: 11px;
                    flex: 0 0 auto;
                }
                .fmg-btn-danger {
                    background: #422;
                    border-color: #644;
                }
                .fmg-btn-danger:hover:not(:disabled) {
                    background: #533;
                }
                .fmg-input {
                    padding: 8px;
                    background: #111;
                    border: 1px solid #333;
                    color: white;
                    border-radius: 4px;
                    width: 100%;
                    box-sizing: border-box;
                }
                .fmg-input-small {
                    padding: 4px 6px;
                    font-size: 11px;
                }
                .fmg-input:focus {
                    outline: none;
                    border-color: #555;
                }
                .fmg-btn.full-width {
                    width: 100%;
                }
                .fmg-sync-info {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 11px;
                    color: #888;
                }
                .fmg-sync-status {
                    font-style: italic;
                }
                .fmg-token-link {
                    color: #6bf;
                    text-decoration: none;
                }
                .fmg-token-link:hover {
                    text-decoration: underline;
                }
                .fmg-token-input-group {
                    display: flex;
                    gap: 5px;
                }
                .fmg-token-input-group .fmg-input {
                    flex: 1;
                }
                .fmg-token-input-group .validate-btn {
                    flex: 0 0 auto;
                    padding: 8px 12px;
                    white-space: nowrap;
                }
                .fmg-rate-limit-info {
                    font-size: 11px;
                    color: #888;
                    margin-top: -3px;
                }
                
                /* Slots styles */
                .fmg-slots-info {
                    font-size: 11px;
                    color: #888;
                    margin-bottom: 8px;
                }
                .fmg-slots-loading {
                    font-size: 12px;
                    color: #888;
                    font-style: italic;
                    padding: 10px;
                    text-align: center;
                }
                .fmg-slots-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .fmg-slot-item {
                    background: #1a1a1a;
                    border: 1px solid #333;
                    border-radius: 4px;
                    padding: 8px;
                }
                .fmg-slot-item.fmg-slot-sync {
                    border-color: #4a6;
                    background: #1a2a1a;
                }
                .fmg-slot-item.fmg-slot-empty {
                    opacity: 0.7;
                }
                .fmg-slot-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 6px;
                }
                .fmg-slot-number {
                    background: #333;
                    color: #fff;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 11px;
                    font-weight: bold;
                    min-width: 20px;
                    text-align: center;
                }
                .fmg-slot-sync .fmg-slot-number {
                    background: #4a6;
                }
                .fmg-slot-name {
                    flex: 1;
                    font-size: 13px;
                    font-weight: bold;
                    color: #fff;
                }
                .fmg-slot-badge {
                    background: #4a6;
                    color: #fff;
                    padding: 1px 4px;
                    border-radius: 3px;
                    font-size: 9px;
                    margin-left: 6px;
                    vertical-align: middle;
                }
                .fmg-slot-details {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .fmg-slot-stats {
                    display: flex;
                    gap: 6px;
                    font-size: 11px;
                    color: #888;
                }
                .fmg-slot-date {
                    font-size: 10px;
                    color: #666;
                }
                .fmg-slot-actions {
                    display: flex;
                    gap: 4px;
                    margin-top: 4px;
                }
                .fmg-slot-empty-state {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .fmg-slot-empty-text {
                    font-size: 11px;
                    color: #666;
                    font-style: italic;
                }
                .fmg-slot-rename,
                .fmg-slot-save {
                    display: flex;
                    gap: 4px;
                    align-items: center;
                }
                .fmg-slot-rename-actions,
                .fmg-slot-save-actions {
                    display: flex;
                    gap: 2px;
                }
            `}</style>
        </div>
    );
}
