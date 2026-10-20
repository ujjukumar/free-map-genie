import { Adapter } from "../core/adapter";
import { setupTwoWayBridge } from "../core/bridge";

import NoopAdapter from "../core/adapters/noop";
import WindowAdapter from "./window";
import PortAdapter from "./port";

import type { OnMessageCallback } from "../core/adapter";
import type { BridgeMessage } from "../core/bridge";

/**
 * Services the (untrusted) page world is allowed to talk to through the
 * window <-> extension bridge. Everything else (storage, offscreen,
 * background, ...) is only reachable from extension contexts.
 */
export const WINDOW_BRIDGE_NAMESPACES: ReadonlySet<string> = new Set([
  "BackendService",
  "ClientService",
  "ContentLoggerService",
  "ExtensionService",
  "MapgenieService",
  "PageService",
]);

export const isAllowedOnWindowBridge = (message: BridgeMessage) =>
  WINDOW_BRIDGE_NAMESPACES.has(message.namespace);

export default class ContentScriptAdapter extends Adapter {
  private readonly portAdapter;
  private readonly windowAdapter;

  public constructor() {
    super();

    this.portAdapter = new PortAdapter();

    if ("window" in globalThis) {
      this.windowAdapter = new WindowAdapter();

      setupTwoWayBridge(
        "content-script",
        this.windowAdapter,
        this.portAdapter,
        isAllowedOnWindowBridge
      );
    } else {
      this.windowAdapter = new NoopAdapter();
    }
  }

  public onMessage(cb: OnMessageCallback) {
    this.portAdapter.onMessage(cb);
  }

  public sendMessage(message: any) {
    this.portAdapter.sendMessage(message);
  }

  public disconnect() {
    this.portAdapter.disconnect();
    this.windowAdapter.disconnect();
  }
}
