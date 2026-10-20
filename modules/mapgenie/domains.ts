/**
 * Known MapGenie domains, used when the MapGenie API can't be reached at
 * build time. Keep in sync with the hosts returned by /api/v1/games.
 */
export const FALLBACK_DOMAINS: readonly string[] = [
  "division2map.com",
  "fallout4map.com",
  "fo76map.com",
  "gta-5-map.com",
  "mapgenie.io",
  "rdr2map.com",
];

/** Match pattern placeholder expanding to `*://<domain>/*` for every domain. */
export const DOMAINS_PLACEHOLDER = "<mapgenie_domains>";

/** Placeholder inside a match pattern, substituted with every domain. */
export const DOMAIN_PLACEHOLDER = "<mapgenie_domain>";

/**
 * Expands mapgenie domain placeholders in a list of match patterns (in place).
 */
export const expandDomainPatterns = (
  patterns: string[] | undefined,
  domains: readonly string[]
) => {
  if (!patterns) return;

  const expanded = patterns.flatMap((pattern) => {
    if (pattern === DOMAINS_PLACEHOLDER) {
      return domains.map((domain) => `*://${domain}/*`);
    }
    if (pattern.includes(DOMAIN_PLACEHOLDER)) {
      return domains.map((domain) =>
        pattern.replaceAll(DOMAIN_PLACEHOLDER, domain)
      );
    }
    return [pattern];
  });

  patterns.splice(0, patterns.length, ...expanded);
};
