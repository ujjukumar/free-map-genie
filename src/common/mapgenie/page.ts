import { waitForBody } from "@/common/dom";

export type PageType =
  | "home"
  | "game-home"
  | "map"
  | "guide"
  | "tarkov-quests-17"
  | "login"
  | "unknown";

const isHomePage = () => {
  return (
    window.location.host === "mapgenie.io" && window.location.pathname === "/"
  );
};

const hasMapgenieCndUrl = () => {
  return document.querySelector(`[href*="cdn.mapgenie.io"]`) !== null;
};

const hasMapgeniePrebid = () => {
  return document.querySelector(`[src$="mapgenie.prebid.js"]`) !== null;
};

const isMapgenieSite = () => {
  return hasMapgenieCndUrl() || hasMapgeniePrebid();
};

export const getPageType = async (): Promise<PageType> => {
  await waitForBody();

  if (isHomePage()) {
    return "home";
  }

  if (!isMapgenieSite()) {
    return "unknown";
  }

  if (window.location.pathname.endsWith("/login")) {
    return "login";
  }

  const { classList } = document.body;

  if (classList.contains("map")) {
    return "map";
  } else if (classList.contains("guide")) {
    return "guide";
  } else if (classList.contains("game-home")) {
    return "game-home";
  } else {
    return "unknown";
  }
};
