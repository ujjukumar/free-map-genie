import { describe, expect, it } from "vitest";

import { mergeLegacyPresets } from "./presets";

describe("mergeLegacyPresets", () => {
  it("merges identical presets across maps and keeps built-in ids", () => {
    const result = mergeLegacyPresets([
      {
        presets: [
          { id: 0, title: "A", categories: [2, 1] },
          { id: 1, title: "B", categories: [3] },
        ],
        order: [-1, 1, 0],
      },
      {
        presets: [
          { id: 0, title: "A", categories: [1, 2] },
          { id: 1, title: "C", categories: [4] },
        ],
        order: [1, 0, -2],
      },
    ]);

    expect(result.presets).toEqual([
      { id: 0, title: "A", categories: [2, 1] },
      { id: 1, title: "B", categories: [3] },
      { id: 2, title: "C", categories: [4] },
    ]);
    expect(result.presetOrdering).toEqual([-1, 1, 0, 2, -2]);
  });

  it("drops dangling ids and appends unordered presets", () => {
    const result = mergeLegacyPresets([
      {
        presets: [{ id: 5, title: "A", categories: [] }],
        order: [7],
      },
    ]);

    expect(result.presets).toEqual([{ id: 0, title: "A", categories: [] }]);
    expect(result.presetOrdering).toEqual([0]);
  });
});
