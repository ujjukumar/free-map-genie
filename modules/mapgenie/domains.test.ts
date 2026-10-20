import { describe, expect, it } from "vitest";

import { expandDomainPatterns } from "./domains";

describe("expandDomainPatterns", () => {
  const domains = ["a.com", "b.io"];

  it("expands the domains placeholder and keeps other patterns", () => {
    const patterns = ["<mapgenie_domains>", "*://example.com/*"];
    expandDomainPatterns(patterns, domains);

    expect(patterns).toEqual([
      "*://a.com/*",
      "*://b.io/*",
      "*://example.com/*",
    ]);
  });

  it("substitutes the domain placeholder inside a pattern", () => {
    const patterns = ["*://<mapgenie_domain>/?fmgStorage"];
    expandDomainPatterns(patterns, domains);

    expect(patterns).toEqual(["*://a.com/?fmgStorage", "*://b.io/?fmgStorage"]);
  });

  it("ignores undefined patterns", () => {
    expect(() => expandDomainPatterns(undefined, domains)).not.toThrow();
  });
});
