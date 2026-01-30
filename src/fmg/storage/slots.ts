import FMG_Keys from "./keys";
import { FMG_LocalStorageDriver } from "./drivers/local-storage";

export interface FMG_Slot {
    id: number;
    name: string;
    date: string;
    count: number;
    data: FMG.Storage.V2.StorageObject;
}

export class FMG_SlotManager {
    private static readonly SLOT_COUNT = 4;
    private window: Window;
    private keyData: FMG.Storage.KeyData;
    private driver: FMG_LocalStorageDriver;
    private onUpdate?: () => void;

    constructor(
        window: Window,
        keyData: FMG.Storage.KeyData,
        onUpdate?: () => void
    ) {
        this.window = window;
        this.keyData = keyData;
        this.driver = new FMG_LocalStorageDriver(window);
        this.onUpdate = onUpdate;
    }

    /**
     * Get the storage key for a specific slot.
     */
    private getSlotKey(slotId: number): string {
        const { gameId, mapId, userId } = this.keyData;
        return `fmg:slots:game_${gameId}:map_${mapId}:user_${userId}:slot_${slotId}`;
    }

    /**
     * Get all slots.
     */
    public async getSlots(): Promise<(FMG_Slot | null)[]> {
        const slots: (FMG_Slot | null)[] = [];
        for (let i = 0; i < FMG_SlotManager.SLOT_COUNT; i++) {
            const key = this.getSlotKey(i);
            const slot = await this.driver.get<FMG_Slot>(key);
            slots.push(slot || null);
        }
        return slots;
    }

    /**
     * Save data to a slot.
     */
    public async saveSlot(
        id: number,
        name: string,
        data: FMG.Storage.V2.StorageObject
    ): Promise<void> {
        if (id < 0 || id >= FMG_SlotManager.SLOT_COUNT) {
            throw new Error("Invalid slot ID");
        }

        const slot: FMG_Slot = {
            id,
            name,
            date: new Date().toISOString(),
            count: data.locationIds.length,
            data
        };

        const key = this.getSlotKey(id);
        await this.driver.set(key, slot);
        this.onUpdate?.();
    }

    /**
     * Load data from a slot.
     */
    public async loadSlot(id: number): Promise<FMG.Storage.V2.StorageObject> {
        const key = this.getSlotKey(id);
        const slot = await this.driver.get<FMG_Slot>(key);

        if (!slot) {
            throw new Error("Slot is empty");
        }

        return slot.data;
    }

    /**
     * Delete a slot.
     */
    public async deleteSlot(id: number): Promise<void> {
        const key = this.getSlotKey(id);
        await this.driver.remove(key);
        this.onUpdate?.();
    }

    /**
     * Rename a slot (without updating data).
     */
    public async renameSlot(id: number, newName: string): Promise<void> {
        const key = this.getSlotKey(id);
        const slot = await this.driver.get<FMG_Slot>(key);

        if (!slot) {
            throw new Error("Cannot rename empty slot");
        }

        slot.name = newName;
        await this.driver.set(key, slot);
        this.onUpdate?.();
    }
}
