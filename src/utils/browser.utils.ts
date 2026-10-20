import extensionService from "@/services/extension.service";

import type { Browser, PublicPathLike } from "wxt/browser";

export class BrowserUtils {
  private static extension: extensionService.Instance;

  public static async getActiveTab(): Promise<Browser.tabs.Tab | undefined> {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    return tab;
  }

  public static async getActiveTabId() {
    const tab = await this.getActiveTab();
    return tab?.id;
  }

  public static async getURL(path: string) {
    if (browser && "runtime" in browser) {
      return browser.runtime.getURL(path);
    }
    this.extension ??= extensionService.use();
    return this.extension.getURL(path);
  }

  public static async getCssUrl() {
    if (browser && "runtime" in browser) {
      return browser.runtime.getURL(
        `/content-scripts/${import.meta.env.ENTRYPOINT}.css`
      );
    }
    return this.getURL(`/assets/${import.meta.env.ENTRYPOINT}.css`);
  }
}

export const injectStyle = async (path: PublicPathLike) => {
  return new Promise<void>((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = browser.runtime.getURL(path);
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener("error", (e) => reject(e), { once: true });
    document.head.appendChild(link);
  });
};
