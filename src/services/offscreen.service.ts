import { createService } from "@/common/messaging";
import { waitForBody } from "@/common/dom";

import type { ProxiedObject } from "@/common/messaging";

export class OffscreenService {
  private readonly _iframes = new Map<string, HTMLIFrameElement>();

  private async createIframe(url: string) {
    const body = await waitForBody();

    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-same-origin");
    iframe.style.display = "none";
    iframe.src = url;

    body.appendChild(iframe);
    return iframe;
  }

  public getIframes() {
    return [...this._iframes.keys()];
  }

  private normalizeUrl(url: string): string {
    try {
      return new URL(url).toString();
    } catch {
      return new URL(`https://${url}`).toString();
    }
  }

  public async reloadIframe(url: string) {
    const normalizedUrl = this.normalizeUrl(url);

    const iframe = this._iframes.get(normalizedUrl);

    if (!iframe) return;

    return new Promise<void>((resolve) => {
      iframe.addEventListener("load", () => resolve(), { once: true });
      iframe.removeAttribute("src");
      iframe.setAttribute("src", normalizedUrl);
    });
  }

  public async addIframe(url: string) {
    const normalizedUrl = this.normalizeUrl(url);

    if (this._iframes.has(normalizedUrl)) return;

    const iframe = await this.createIframe(normalizedUrl);
    this._iframes.set(normalizedUrl, iframe);
  }

  public removeIframe(url: string) {
    const normalizedUrl = this.normalizeUrl(url);

    const iframe = this._iframes.get(normalizedUrl);

    if (!iframe) return;

    iframe.remove();
    this._iframes.delete(normalizedUrl);
  }
}

const offscreenService = createService({
  context: OffscreenService,
  namespace: "OffscreenService",
  heartbeatTimeout: import.meta.env.SERVICE_TIMEOUT,
});

namespace offscreenService {
  export type Instance = ProxiedObject<OffscreenService>;
}

export default offscreenService;
