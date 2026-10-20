import { mergeLegacyPresets } from "./presets";

import type { LocalV1Data } from "../v1.schema";
import type { UserData } from "@/common/storage/format";

export class V1MigratorHelper {
  private migrateLocations(legacyData: LocalV1Data) {
    return legacyData.sharedData?.locations ?? {};
  }

  private migrateCategories(legacyData: LocalV1Data) {
    const categories = new Set<number>();
    for (const mapId in legacyData.mapData) {
      const mapData = legacyData.mapData?.[mapId];
      for (const categoryIdStr in mapData?.categories ?? {}) {
        categories.add(Number(categoryIdStr));
      }
    }
    return Array.from(categories);
  }

  private migratePresets(legacyData: LocalV1Data) {
    return mergeLegacyPresets(
      Object.values(legacyData.mapData ?? {}).map((mapData) => ({
        presets: Object.values(mapData.presets ?? {}),
        order: mapData.presets_order ?? [],
      }))
    );
  }

  public migrate(legacyData: LocalV1Data): UserData {
    const locations = this.migrateLocations(legacyData);
    const trackedCategoryIds = this.migrateCategories(legacyData);
    const { presets, presetOrdering } = this.migratePresets(legacyData);

    return {
      locations,
      trackedCategoryIds,
      presets,
      presetOrdering,
      notes: [],
    };
  }
}
