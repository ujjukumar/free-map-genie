function createMatchForId(
    keyData: Partial<FMG.Storage.KeyData>,
    name: keyof FMG.Storage.KeyData
) {
    if (keyData[name] !== undefined) {
        return `(?<${name}>${keyData[name]})`;
    }
    return `(?<${name}>[-]?\\d+)`;
}

export default class FMG_Keys {
    public readonly keyData: FMG.Storage.KeyData;

    constructor(keyData: FMG.Storage.KeyData) {
        this.keyData = keyData;
    }

    public get v1Key() {
        return FMG_Keys.getV1Key(this.keyData);
    }

    public get v2Key() {
        return FMG_Keys.getV2Key(this.keyData);
    }

    public get latestKey() {
        return FMG_Keys.getLatestKey(this.keyData);
    }

    public getV2KeyForMap(mapId: Id) {
        return FMG_Keys.getV2Key({ ...this.keyData, mapId });
    }

    static getV1Key(keyData: FMG.Storage.KeyData) {
        return `mg:game_${keyData.gameId}:user_${keyData.userId}:v5`;
    }

    static getV1KeyMatch(keyData: Partial<FMG.Storage.KeyData>) {
        const gameId = createMatchForId(keyData, "gameId");
        const userId = createMatchForId(keyData, "userId");
        return new RegExp(`^mg:game_${gameId}:user_${userId}:v5$`);
    }

    static getV2Key(keyData: FMG.Storage.KeyData) {
        return `fmg:game_${keyData.gameId}:map_${keyData.mapId}:user_${keyData.userId}`;
    }

    static getV2KeyMatch(keyData: Partial<FMG.Storage.KeyData>) {
        const gameId = createMatchForId(keyData, "gameId");
        const mapId = createMatchForId(keyData, "mapId");
        const userId = createMatchForId(keyData, "userId");
        return new RegExp(`^fmg:game_${gameId}:map_${mapId}:user_${userId}$`);
    }

    static getLatestKey(keyData: FMG.Storage.KeyData) {
        return this.getV2Key(keyData);
    }

    static getLatestKeyMatch(keyData: Partial<FMG.Storage.KeyData>) {
        return this.getV2KeyMatch(keyData);
    }

    /**
     * Get a regex to match all keys for a specific game+map combination
     * This ignores userId, useful for finding duplicate entries
     */
    static getV2KeyMatchByGameAndMap(gameId: number, mapId: number): RegExp {
        return new RegExp(`^fmg:game_${gameId}:map_${mapId}:user_([-]?\\d+)$`);
    }

    /**
     * Extract gameId, mapId, and userId from a v2 storage key
     */
    static parseV2Key(
        key: string
    ): { gameId: number; mapId: number; userId: number } | null {
        const match = key.match(/^fmg:game_(\d+):map_(\d+):user_([-]?\d+)$/);
        if (!match) return null;
        return {
            gameId: parseInt(match[1]),
            mapId: parseInt(match[2]),
            userId: parseInt(match[3])
        };
    }
}
