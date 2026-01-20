import FMG_Keys from "@fmg/storage/keys";

describe("FMG_Keys", () => {
    const keyData: FMG.Storage.KeyData = {
        gameId: 1,
        mapId: 10,
        userId: 100
    };

    it("should generate V1 key correctly", () => {
        expect(FMG_Keys.getV1Key(keyData)).toBe("mg:game_1:user_100:v5");
    });

    it("should generate V2 key correctly", () => {
        expect(FMG_Keys.getV2Key(keyData)).toBe("fmg:game_1:map_10:user_100");
    });

    it("should generate latest key (V2) correctly", () => {
        expect(FMG_Keys.getLatestKey(keyData)).toBe(
            "fmg:game_1:map_10:user_100"
        );
    });

    it("should generate V1 key match regex correctly", () => {
        const regex = FMG_Keys.getV1KeyMatch({ gameId: 1 });
        expect(regex.test("mg:game_1:user_100:v5")).toBe(true);
        expect(regex.test("mg:game_2:user_100:v5")).toBe(false);

        const groups = regex.exec("mg:game_1:user_100:v5")?.groups;
        expect(groups?.gameId).toBe("1");
        expect(groups?.userId).toBe("100");
    });

    it("should generate V2 key match regex correctly", () => {
        const regex = FMG_Keys.getV2KeyMatch({ gameId: 1, mapId: 10 });
        expect(regex.test("fmg:game_1:map_10:user_100")).toBe(true);
        expect(regex.test("fmg:game_1:map_11:user_100")).toBe(false);

        const groups = regex.exec("fmg:game_1:map_10:user_100")?.groups;
        expect(groups?.gameId).toBe("1");
        expect(groups?.mapId).toBe("10");
        expect(groups?.userId).toBe("100");
    });

    it("should handle partial key data for V2 match regex", () => {
        const regex = FMG_Keys.getV2KeyMatch({});
        expect(regex.test("fmg:game_1:map_10:user_100")).toBe(true);

        const groups = regex.exec("fmg:game_1:map_10:user_100")?.groups;
        expect(groups?.gameId).toBe("1");
        expect(groups?.mapId).toBe("10");
        expect(groups?.userId).toBe("100");
    });
});
