import { useState, useEffect } from "react";
import Button from "../Button";
import Icon from "@components/Icon";
import type {
    FMG_GlobalSlotManager,
    GlobalSlot
} from "@fmg/storage/global-slots";

interface SlotsProps {
    slotManager: FMG_GlobalSlotManager;
    mapManager: any;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    userId: number;
}

export default function Slots({
    slotManager,
    mapManager,
    loading,
    setLoading,
    userId
}: SlotsProps) {
    const [slots, setSlots] = useState<(GlobalSlot | null)[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");

    // Fetch slots on mount and when mapManager updates
    useEffect(() => {
        const updateSlots = () => {
            slotManager.getSlots().then(setSlots).catch(logger.error);
        };

        updateSlots();

        // Listen for updates from MapManager
        mapManager.on("fmg-update", updateSlots);

        return () => {
            mapManager.off("fmg-update", updateSlots);
        };
    }, [slotManager, mapManager]);

    const isSyncSlot = (index: number): boolean => {
        return index === 0;
    };

    const handleSave = async (index: number) => {
        const slotLabel = isSyncSlot(index) ? "Sync Slot" : `Slot ${index}`;
        if (!confirm(`Save ALL maps to ${slotLabel}?`)) return;
        setLoading(true);
        try {
            // Use the mapManager's dataManager to save ALL maps to slot
            const result = await mapManager.dataManager.saveToSlot(
                index,
                isSyncSlot(index) ? "GitHub Sync" : `Slot ${index}`
            );
            if (result.success) {
                window.toastr.success(result.message);
            } else {
                window.toastr.error(result.error || "Failed to save");
            }
        } catch (e: any) {
            window.toastr.error("Failed to save: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLoad = async (index: number) => {
        const slotLabel = isSyncSlot(index) ? "Sync Slot" : `Slot ${index}`;
        if (
            !confirm(
                `Load ${slotLabel}? This will overwrite current progress for all maps in this slot. Continue?`
            )
        )
            return;
        setLoading(true);
        try {
            // Use the mapManager's dataManager to load from slot
            const result = await mapManager.dataManager.loadFromSlot(
                index,
                userId,
                "overwrite"
            );
            if (result.success) {
                await mapManager.reload();
                window.toastr.success(result.message);
            } else {
                window.toastr.error(result.error || "Failed to load");
            }
        } catch (e: any) {
            window.toastr.error("Failed to load: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleMerge = async (index: number) => {
        const slotLabel = isSyncSlot(index) ? "Sync Slot" : `Slot ${index}`;
        if (
            !confirm(
                `Merge ${slotLabel} with current data? This will combine data without overwriting. Continue?`
            )
        )
            return;
        setLoading(true);
        try {
            const result = await mapManager.dataManager.loadFromSlot(
                index,
                userId,
                "merge"
            );
            if (result.success) {
                await mapManager.reload();
                window.toastr.success(`Merged from ${slotLabel}`);
            } else {
                window.toastr.error(result.error || "Failed to merge");
            }
        } catch (e: any) {
            window.toastr.error("Failed to merge: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (index: number) => {
        if (isSyncSlot(index)) {
            window.toastr.warning("Cannot delete the Sync Slot");
            return;
        }
        if (!confirm(`Delete Slot ${index}?`)) return;
        setLoading(true);
        try {
            await slotManager.deleteSlot(index);
            window.toastr.success(`Deleted Slot ${index}`);
        } catch (e: any) {
            window.toastr.error("Failed to delete: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const startEditing = (slot: GlobalSlot) => {
        if (isSyncSlot(slot.id)) {
            window.toastr.warning("Cannot rename the Sync Slot");
            return;
        }
        setEditingId(slot.id);
        setEditName(slot.name);
    };

    const saveName = async (index: number) => {
        if (isSyncSlot(index)) {
            window.toastr.warning("Cannot rename the Sync Slot");
            return;
        }
        setLoading(true);
        try {
            await slotManager.renameSlot(index, editName);
            setEditingId(null);
            window.toastr.success("Renamed slot");
        } catch (e: any) {
            window.toastr.error("Failed to rename: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="slots-container">
            {slots.map((slot, index) => (
                <div
                    key={index}
                    className={`slot-row ${isSyncSlot(index) ? "sync-slot" : ""}`}
                >
                    <div className="slot-info">
                        {isSyncSlot(index) && (
                            <div className="sync-badge">SYNC</div>
                        )}
                        {slot ? (
                            <>
                                {editingId === index ? (
                                    <div className="slot-rename">
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) =>
                                                setEditName(e.target.value)
                                            }
                                            autoFocus
                                        />
                                        <button
                                            className="btn-icon"
                                            onClick={() => saveName(index)}
                                        >
                                            <Icon icon="download" />
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        className="slot-name"
                                        onClick={() => startEditing(slot)}
                                        title={
                                            isSyncSlot(index)
                                                ? "GitHub Sync Slot"
                                                : "Click to rename"
                                        }
                                    >
                                        {slot.name}
                                        {!isSyncSlot(index) && (
                                            <Icon
                                                icon="cog"
                                                className="edit-icon"
                                            />
                                        )}
                                    </div>
                                )}
                                <div className="slot-meta">
                                    {slot.mapCount} maps • {slot.totalLocations}{" "}
                                    locations •{" "}
                                    {new Date(slot.date).toLocaleDateString()}
                                </div>
                            </>
                        ) : (
                            <div className="slot-empty">
                                {isSyncSlot(index)
                                    ? "Sync Slot (Empty)"
                                    : `Empty Slot ${index}`}
                            </div>
                        )}
                    </div>
                    <div className="slot-actions">
                        <Button
                            onClick={() => handleSave(index)}
                            disabled={loading}
                        >
                            <Icon icon="download" />
                        </Button>
                        {slot && (
                            <>
                                <Button
                                    onClick={() => handleLoad(index)}
                                    disabled={loading}
                                >
                                    <Icon icon="upload" />
                                </Button>
                                <Button
                                    onClick={() => handleMerge(index)}
                                    disabled={loading}
                                >
                                    <Icon icon="random" />
                                </Button>
                                {!isSyncSlot(index) && (
                                    <Button
                                        onClick={() => handleDelete(index)}
                                        disabled={loading}
                                    >
                                        <Icon icon="trash" />
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
