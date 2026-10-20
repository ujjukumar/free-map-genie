import { beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import Dexie from "dexie";

import { DexieDatabase } from "./databases";
import { autoBackups, createAutoBackup, MAX_AUTO_BACKUPS } from "./autoBackup";
import { SaveHelper } from "./saves";
import { SerializedFile } from "./saves/file";
import { Key } from "./key";

describe("auto backups", () => {
  let database: DexieDatabase;

  beforeEach(async () => {
    fakeBrowser.reset();
    await Dexie.delete("fmg:database");
    database = new DexieDatabase();
  });

  it("skips an empty database so wiped data never rotates out backups", async () => {
    expect(await createAutoBackup(database)).toBe(false);
    expect(await autoBackups.getValue()).toEqual([]);
  });

  it("stores a restorable save per user and skips unchanged data", async () => {
    await database.locations.setFound(new Key(20, 1), 123, true);
    await database.categories.setTracked(new Key(21, -1), 7, true);

    expect(await createAutoBackup(database)).toBe(true);
    expect(await createAutoBackup(database)).toBe(false);

    const [backup] = await autoBackups.getValue();
    const { saves } = new SaveHelper().read(
      backup.files.map((f) => new SerializedFile(f.filename, f.content))
    );

    expect(saves).toHaveLength(2);
    expect(saves.find((s) => s.userId === 1)?.games[20].locations).toEqual({
      123: true,
    });
    expect(
      saves.find((s) => s.userId === -1)?.games[21].trackedCategoryIds
    ).toEqual([7]);
  });

  it(`keeps the newest ${MAX_AUTO_BACKUPS} backups`, async () => {
    for (let i = 0; i < MAX_AUTO_BACKUPS + 2; i++) {
      await database.locations.setFound(new Key(20, 1), i, true);
      await createAutoBackup(database);
    }

    const backups = await autoBackups.getValue();
    expect(backups).toHaveLength(MAX_AUTO_BACKUPS);

    const newest = JSON.parse(backups[0].files[0].content);
    expect(newest.games[20].locations).toHaveLength(MAX_AUTO_BACKUPS + 2);
  });
});
