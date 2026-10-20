import { beforeEach, describe, expect, it } from "vitest";
import Dexie from "dexie";

import { DexieDatabase, LocalDatabase } from "./databases";
import { LEGACY_BACKUP_PREFIX } from "./databases/local";
import { Migrator } from "./migrator";
import { Key } from "./key";

import storageV1 from "@@/e2e/data/storage.v1.json";
import storageV2 from "@@/e2e/data/storage.v2.json";
import expectedV1 from "@@/e2e/data/userdata.v1.expected.json";
import expectedV2 from "@@/e2e/data/userdata.v2.expected.json";

import type { UserData } from "./format";

interface StorageFixture {
  origins: {
    origin: string;
    localStorage: { name: string; value: string }[];
  }[];
}

type ExpectedFixture = Record<
  string,
  { removedKeys: string[]; userData: UserData }
>;

const VERSIONS = {
  v1: { storage: storageV1, expected: expectedV1 },
  v2: { storage: storageV2, expected: expectedV2 },
} as unknown as Record<
  "v1" | "v2",
  { storage: StorageFixture; expected: ExpectedFixture }
>;

const loadLegacyStorage = (fixture: StorageFixture) => {
  const origin = fixture.origins.find(
    (o) => o.origin === window.location.origin
  );
  for (const { name, value } of origin?.localStorage ?? []) {
    localStorage.setItem(name, value);
  }
};

const stableNote = ({
  id: _id,
  created_at: _createdAt,
  game_id: _gameId,
  ...rest
}: Record<string, unknown>) => rest;

const expectUserData = (actual: UserData, expected: UserData) => {
  expect(actual.locations).toEqual(expected.locations);
  expect(actual.trackedCategoryIds).toEqual(
    expect.arrayContaining(expected.trackedCategoryIds)
  );
  // Note ids and timestamps are regenerated on migration.
  expect(actual.notes.map(stableNote)).toEqual(
    expect.arrayContaining(expected.notes.map(stableNote))
  );
  // Demo presets in the fixtures are injected by the MapGenie page, not storage.
  const userPresets = expected.presets.filter(
    (p) => !(p as { is_demo_preset?: boolean }).is_demo_preset
  );
  expect(actual.presets).toEqual(expect.arrayContaining(userPresets));
  expect(actual.presetOrdering).toEqual(
    expect.arrayContaining(userPresets.map((p) => p.id))
  );
};

// Fixtures for https://mapgenie.io (see vitest.config.ts) use game 20, user 0.
const key = new Key(20, 0);

describe.each(Object.entries(VERSIONS))(
  "legacy %s storage",
  (_version, { storage, expected }) => {
    const { removedKeys, userData } = expected[`${key.gameId}:${key.userId}`];

    beforeEach(() => loadLegacyStorage(storage));

    it("reads and upgrades legacy data", async () => {
      const local = new LocalDatabase(window.location.host);

      expect(await local.hasData(key)).toBe(true);
      const data = await local.getData(key);
      expectUserData(data, userData);

      if (_version === "v2") {
        expect(data.presets).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              title: "Test",
              categories: [941, 942, 943, 944],
            }),
          ])
        );
      }
    });

    it("archives legacy keys instead of deleting them", async () => {
      const local = new LocalDatabase(window.location.host);
      const originals = Object.fromEntries(
        removedKeys.map((k) => [k, localStorage.getItem(k)])
      );

      await local.archiveData(key);

      expect(await local.hasData(key)).toBe(false);
      for (const k of removedKeys) {
        expect(localStorage.getItem(k)).toBeNull();
        expect(localStorage.getItem(LEGACY_BACKUP_PREFIX + k)).toBe(
          originals[k]
        );
      }
    });

    describe("Migrator", () => {
      beforeEach(async () => {
        await Dexie.delete("fmg:database");
      });

      it("moves legacy data into the database and keeps a backup", async () => {
        await new Migrator().migrate(window.location.host, key);

        expectUserData(await new DexieDatabase().getData(key), userData);

        if (_version === "v2") {
          const { presets, presetOrdering } = await new DexieDatabase().getData(
            key
          );
          const test = presets.find((p) => p.title === "Test");
          expect(test?.categories).toEqual([941, 942, 943, 944]);
          expect(presetOrdering).toEqual([-1, test?.id]);
        }
        for (const k of removedKeys) {
          expect(localStorage.getItem(k)).toBeNull();
          expect(localStorage.getItem(LEGACY_BACKUP_PREFIX + k)).not.toBeNull();
        }

        // Running again must not touch the already migrated data.
        expect(await new LocalDatabase(window.location.host).hasData(key)).toBe(
          false
        );
      });
    });
  }
);

describe("legacy v2 key matching", () => {
  it("does not match other games sharing the same id prefix", async () => {
    localStorage.setItem("fmg:game_1:map_1:user_0", "{}");
    localStorage.setItem("fmg:game_10:map_5:user_0", "{}");
    localStorage.setItem("fmg:game_12:map_7:user_0", "{}");

    const local = new LocalDatabase(window.location.host);
    await local.archiveData(new Key(1, 0));

    expect(localStorage.getItem("fmg:game_1:map_1:user_0")).toBeNull();
    expect(localStorage.getItem("fmg:game_10:map_5:user_0")).toBe("{}");
    expect(localStorage.getItem("fmg:game_12:map_7:user_0")).toBe("{}");
    expect(await local.hasData(new Key(10, 0))).toBe(true);
  });

  it("does not match other users sharing the same id suffix", async () => {
    localStorage.setItem("fmg:game_1:map_1:user_17", "{}");

    const local = new LocalDatabase(window.location.host);

    expect(await local.hasData(new Key(1, 7))).toBe(false);
  });
});
