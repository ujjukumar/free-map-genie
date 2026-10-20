import { V1 } from "./versions/v1";
import { V2 } from "./versions/v2";
import { createEmptyUserData } from "../../format";
import { LocalStorageDriver } from "./drivers/local";
import { RemoteLocalStorageDriver } from "./drivers/local.remote";

import type { Database } from "../database";
import type { Driver } from "./drivers/driver";
import type { Key } from "../../key";
import type { UserData } from "../../format";

/** Prefix under which migrated legacy (fmg v1/v2) entries are kept. */
export const LEGACY_BACKUP_PREFIX = "fmg-backup:";

// Legacy storage
// fmg@v1 - fmg@v2
export class LocalDatabase implements Database {
  private readonly driver: Driver;
  private readonly v1: V1;
  private readonly v2: V2;

  public constructor(domain: string) {
    this.driver = this.getDriverForDomain(domain);
    this.v1 = new V1(this.driver);
    this.v2 = new V2(this.driver);
  }

  private getHost(url: string): string {
    try {
      return new URL(url).host;
    } catch {
      return new URL("https://" + url).host;
    }
  }

  private getDriverForDomain(domain: string): Driver {
    const host = this.getHost(domain);

    if (host === location.host) {
      // For same-domain, use local driver
      return new LocalStorageDriver();
    } else {
      // For cross-domain, use remote driver
      return new RemoteLocalStorageDriver(host);
    }
  }

  public async open(): Promise<void> {}
  public async close(): Promise<void> {}

  public async hasData(key: Key): Promise<boolean> {
    if (await this.v2.hasData(key)) return true;
    return this.v1.hasData(key);
  }

  public async getData(key: Key) {
    if (await this.v2.hasData(key)) {
      const data = await this.v2.getData(key);
      return this.v2.upgrade(key, data);
    }
    if (await this.v1.hasData(key)) {
      const data = await this.v1.getData(key);
      return this.v1.upgrade(key, data);
    }
    return createEmptyUserData();
  }

  public async setData(key: Key, data: UserData): Promise<void> {
    throw new Error("LocalDatabase.setData is not supported");
  }

  public async removeData(key: Key): Promise<void> {
    await Promise.all([this.v1.removeData(key), this.v2.removeData(key)]);
  }

  /**
   * Moves legacy data out of the way after a successful migration. Each entry
   * is kept under {@link LEGACY_BACKUP_PREFIX} so it can be recovered, but is
   * no longer detected as un-migrated data.
   */
  public async archiveData(key: Key): Promise<void> {
    const keys = [
      ...(await this.v1.getStorageKeys(key)),
      ...(await this.v2.getStorageKeys(key)),
    ];
    const values = await this.driver.getBulk(keys);

    for (const storageKey of keys) {
      const value = values[storageKey];
      if (value != null) {
        try {
          await this.driver.set(LEGACY_BACKUP_PREFIX + storageKey, value);
        } catch (err) {
          // Data is already committed to the new database, so don't block
          // the migration if e.g. the localStorage quota is exceeded.
          logger.warn("Failed to back up legacy data before removal.", {
            key: storageKey,
            err,
          });
        }
      }
      await this.driver.remove(storageKey);
    }
  }
}
