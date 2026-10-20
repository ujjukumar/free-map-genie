import { SaveHelper } from "./saves";

import type { DexieDatabase } from "./databases";

/**
 * FMG data lives in the IndexedDB of mapgenie.io, so clearing the site data of
 * mapgenie.io wipes it. Automatic backups are kept in the extension's own
 * storage, which survives that, and can be restored with the Data Manager.
 */
export interface AutoBackup {
  createdAt: string;
  hash: string;
  files: { filename: string; content: string }[];
}

export const MAX_AUTO_BACKUPS = 3;

export const AUTO_BACKUP_INTERVAL = 10 * 60 * 1000;

export const autoBackups = storage.defineItem<AutoBackup[]>(
  "local:autoBackups",
  { fallback: [] }
);

const sha256 = async (text: string) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
};

/**
 * Stores a snapshot of all user data, unless it is empty or unchanged since
 * the last backup. Empty snapshots are skipped on purpose so a wiped database
 * never rotates out the backups needed to restore it.
 *
 * @returns whether a new backup was stored.
 */
export const createAutoBackup = async (database: DexieDatabase) => {
  const saves = [];
  for (const userId of await database.getUserIds()) {
    const games = await database.export(userId);
    if (Object.keys(games).length > 0) saves.push({ userId, games });
  }

  if (saves.length === 0) return false;

  const hash = await sha256(JSON.stringify(saves));
  const backups = await autoBackups.getValue();
  if (backups[0]?.hash === hash) return false;

  const helper = new SaveHelper();
  const files = saves.map(({ userId, games }) => {
    const { filename, content } = helper.write(userId, games);
    return { filename: `autobackup_${filename}`, content };
  });

  const next = [
    { createdAt: new Date().toISOString(), hash, files },
    ...backups,
  ].slice(0, MAX_AUTO_BACKUPS);

  try {
    await autoBackups.setValue(next);
  } catch (error) {
    // Most likely the storage quota, keep at least the newest backup.
    logger.warn("Failed to store all auto backups, keeping latest", error);
    await autoBackups.setValue(next.slice(0, 1));
  }

  return true;
};

/** Periodically backs up the database while the backend is running. */
export const scheduleAutoBackups = (database: DexieDatabase) => {
  const run = async () => {
    try {
      if (await createAutoBackup(database)) {
        logger.log("Auto backup stored.");
      }
    } catch (error) {
      logger.warn("Auto backup failed", error);
    }
  };

  setTimeout(run, 60 * 1000);
  return setInterval(run, AUTO_BACKUP_INTERVAL);
};
