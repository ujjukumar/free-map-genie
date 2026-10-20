/// <reference types="../../src/types/mapgenie/api.d.ts" />

import Cache from "file-system-cache";

import path from "node:path";
import fs from "node:fs";

import { addViteConfig, defineWxtModule } from "wxt/modules";

import setupServer from "./server";
import define from "./defines";
import { FALLBACK_DOMAINS, expandDomainPatterns } from "./domains";

import type { Wxt } from "wxt";

const cache = Cache({
  basePath: ".cache",
  ns: "mapgenie",
  ttl: 60 * 5, // 5 minutes
});

const FETCH_TIMEOUT_MS = 10_000;

const fetchDomainsFromApi = async (): Promise<string[]> => {
  const res = await fetch("https://mapgenie.io/api/v1/games", {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`MapGenie API responded with ${res.status}`);
  }

  const games = (await res.json()) as MG.Api.Game[];

  return games.map((game) => new URL(game.config.url).host);
};

/**
 * Resolves all MapGenie domains. Always includes the committed fallback list
 * so a flaky or blocked API never breaks (or silently shrinks) the build.
 */
const fetchDomains = async (wxt: Wxt): Promise<string[]> => {
  let fetched: string[] | null = await cache.get("domains");

  if (fetched) {
    wxt.logger.log("[MapGenie] Using cached domains");
  } else {
    wxt.logger.log("[MapGenie] Fetching domains from MapGenie API");
    try {
      fetched = await fetchDomainsFromApi();
      await cache.set("domains", fetched);
    } catch (err) {
      wxt.logger.warn(
        "[MapGenie] Failed to fetch domains, using fallback list.",
        err
      );
      fetched = [];
    }
  }

  const newDomains = fetched.filter((d) => !FALLBACK_DOMAINS.includes(d));
  if (newDomains.length > 0) {
    wxt.logger.warn(
      "[MapGenie] Domains missing from FALLBACK_DOMAINS:",
      newDomains.join(", ")
    );
  }

  return Array.from(new Set([...FALLBACK_DOMAINS, ...fetched])).sort();
};

export default defineWxtModule({
  async setup(wxt) {
    const domains = await fetchDomains(wxt);

    // Add custom defines
    addViteConfig(wxt, () => ({
      define: {
        ...define,
        "import.meta.env.MAPGENIE_DOMAINS": JSON.stringify(domains),
      },
    }));

    wxt.hook("entrypoints:resolved", (_wxt, entrypoints) => {
      for (const ep of entrypoints) {
        if ("matches" in ep.options) {
          expandDomainPatterns(ep.options.matches, domains);
        }
      }
    });

    wxt.hook("build:manifestGenerated", (_wxt, manifest) => {
      for (const resource of manifest.web_accessible_resources ?? []) {
        if (typeof resource === "string") continue;
        expandDomainPatterns(resource.matches, domains);
      }
    });

    const mapgenieDevPort = process.env.MAPGENIE_DEV_PORT ?? 3001;
    const mapgenieDevHost = process.env.MAPGENIE_DEV_HOST ?? "localhost";

    const mapgenieDevOrigin = `http://${mapgenieDevHost}:${mapgenieDevPort}`;

    const mapgenieApiUrl = mapgenieDevOrigin + "/api/v1";

    // Define MAPGENIE_API_URL based on environment
    addViteConfig(wxt, (env) => {
      return {
        define: {
          "import.meta.env.MAPGENIE_API_URL":
            env.mode === "development"
              ? JSON.stringify(mapgenieApiUrl)
              : JSON.stringify("https://www.mapgenie.io/api/v1"),
        },
      };
    });

    // Setup dev server proxy for MapGenie
    wxt.hook("server:created", (wxt) => {
      setupServer(wxt, Number(mapgenieDevPort), mapgenieDevHost);
    });

    // Add MapGenie types
    wxt.hook("prepare:types", (wxt, types) => {
      types.push({
        path: "mapgenie.d.ts",
        text: fs.readFileSync(
          path.resolve(__dirname, "mapgenie.d.ts"),
          "utf-8"
        ),
        tsReference: true,
      });
    });
  },
});
