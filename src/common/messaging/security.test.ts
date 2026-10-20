import { describe, expect, it, vi } from "vitest";

import WindowAdapter from "./adapters/window";
import { isAllowedOnWindowBridge } from "./adapters/contentScript";
import { setupOneWayBridge, type BridgeMessage } from "./core/bridge";
import { resolveInvokable } from "./core/proxy";

const message = (overrides: Partial<BridgeMessage> = {}): BridgeMessage => ({
  id: "1",
  type: "invoke",
  sender: "user",
  path: ["getData"],
  namespace: "BackendService",
  timeStamp: 0,
  ...overrides,
});

describe("resolveInvokable", () => {
  class Base {
    public inherited() {
      return "inherited";
    }
  }

  class Service extends Base {
    private secret = "secret";
    public field = () => this.secret;

    public method() {
      return "method";
    }

    public get getter() {
      return this.secret;
    }
  }

  const service = new Service();

  it("resolves own and inherited prototype methods", () => {
    expect(resolveInvokable(service, ["method"])?.call(service)).toBe("method");
    expect(resolveInvokable(service, ["inherited"])?.call(service)).toBe(
      "inherited"
    );
  });

  it.each([
    [["constructor"]],
    [["secret"]],
    [["field"]],
    [["getter"]],
    [["toString"]],
    [["hasOwnProperty"]],
    [["__proto__"]],
    [["method", "call"]],
    [[]],
    [["missing"]],
  ])("rejects %j", (path) => {
    expect(resolveInvokable(service, path)).toBeUndefined();
  });
});

describe("WindowAdapter", () => {
  const post = (init: MessageEventInit) =>
    window.dispatchEvent(new MessageEvent("message", init));

  const data = { source: ["react"], message: message() };

  it("accepts messages from the same window and origin", () => {
    const adapter = new WindowAdapter(window);
    const cb = vi.fn();
    adapter.onMessage(cb);

    post({ data, source: window, origin: window.location.origin });

    expect(cb).toHaveBeenCalledWith(data.message);
    adapter.disconnect();
  });

  it.each([
    ["another origin", { source: window, origin: "https://ads.example" }],
    ["another frame", { source: null, origin: window.location.origin }],
  ])("ignores messages from %s", (_, init) => {
    const adapter = new WindowAdapter(window);
    const cb = vi.fn();
    adapter.onMessage(cb);

    post({ data, ...(init as MessageEventInit) });

    expect(cb).not.toHaveBeenCalled();
    adapter.disconnect();
  });

  it("ignores malformed data", () => {
    const adapter = new WindowAdapter(window);
    const cb = vi.fn();
    adapter.onMessage(cb);

    for (const data of [null, "string", { source: ["react"] }]) {
      post({ data, source: window, origin: window.location.origin });
    }

    expect(cb).not.toHaveBeenCalled();
    adapter.disconnect();
  });
});

describe("window bridge", () => {
  it.each([
    "BackendService",
    "ClientService",
    "ContentLoggerService",
    "ExtensionService",
    "MapgenieService",
    "PageService",
  ])("allows %s", (namespace) => {
    expect(isAllowedOnWindowBridge(message({ namespace }))).toBe(true);
  });

  it.each(["StorageService::mapgenie.io", "BackgroundService", ""])(
    "blocks %j",
    (namespace) => {
      expect(isAllowedOnWindowBridge(message({ namespace }))).toBe(false);
    }
  );

  it("only forwards messages passing the filter", async () => {
    let listener: (message: unknown) => Promise<void> = async () => {};
    const sendMessage = vi.fn();

    setupOneWayBridge({
      name: "test",
      from: {
        onMessage: (cb) => void (listener = cb as typeof listener),
        disconnect: () => {},
        isValidMessage: (_m): _m is BridgeMessage => true,
      },
      to: {
        sendMessage,
        disconnect: () => {},
        isValidMessage: (_m): _m is BridgeMessage => true,
      },
      filter: isAllowedOnWindowBridge,
    });

    await listener(message({ namespace: "StorageService::mapgenie.io" }));
    expect(sendMessage).not.toHaveBeenCalled();

    await listener(message());
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ namespace: "BackendService" })
    );
  });
});
