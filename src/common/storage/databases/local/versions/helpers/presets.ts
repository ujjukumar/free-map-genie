import type { UserData } from "@/common/storage/format";

type Preset = UserData["presets"][number];

export interface LegacyMapPresets {
  presets: Preset[];
  order: number[];
}

/**
 * Legacy versions stored presets per map, the database stores them per game.
 * Identical presets are merged and get temporary ids, which are remapped to
 * database ids by `DexieDatabase.setData`. Negative ids in the ordering refer
 * to MapGenie's built-in presets and are kept as is.
 */
export function mergeLegacyPresets(maps: LegacyMapPresets[]) {
  const presets: Preset[] = [];
  const presetOrdering: number[] = [];
  const idsByContent = new Map<string, number>();

  const addToOrdering = (id: number) => {
    if (!presetOrdering.includes(id)) presetOrdering.push(id);
  };

  for (const map of maps) {
    const idMap = new Map<number, number>();

    for (const { id, title, categories } of map.presets) {
      const content = JSON.stringify([
        title,
        [...categories].sort((a, b) => a - b),
      ]);

      let newId = idsByContent.get(content);
      if (newId === undefined) {
        newId = presets.length;
        idsByContent.set(content, newId);
        presets.push({ id: newId, title, categories });
      }
      idMap.set(id, newId);
    }

    for (const id of map.order) {
      const newId = idMap.get(id);
      if (newId !== undefined) addToOrdering(newId);
      else if (id < 0) addToOrdering(id);
    }

    for (const newId of idMap.values()) addToOrdering(newId);
  }

  return { presets, presetOrdering };
}
