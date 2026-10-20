import { afterEach, describe, expect, it } from "vitest";

import { getPageType } from "./page";

describe("getPageType", () => {
  afterEach(() => {
    history.pushState(null, "", "/");
    document.head.innerHTML = "";
    document.body.className = "";
  });

  const mapgenieSite = (path: string, bodyClass = "") => {
    history.pushState(null, "", path);
    const link = document.createElement("link");
    link.href = "https://cdn.mapgenie.io/css/app.css";
    document.head.appendChild(link);
    document.body.className = bodyClass;
  };

  it("detects the mapgenie home page", async () => {
    expect(await getPageType()).toBe("home");
  });

  it("returns unknown for non mapgenie sites", async () => {
    history.pushState(null, "", "/game/maps/world");
    document.body.className = "map";
    expect(await getPageType()).toBe("unknown");
  });

  it.each([
    ["/game/maps/world", "map", "map"],
    ["/game/guides/checklist", "guide", "guide"],
    ["/game", "game-home", "game-home"],
    ["/game/other", "", "unknown"],
  ])("detects %s with body class '%s' as %s", async (path, cls, type) => {
    mapgenieSite(path, cls);
    expect(await getPageType()).toBe(type);
  });

  it("detects the login page", async () => {
    mapgenieSite("/login");
    expect(await getPageType()).toBe("login");
  });
});
