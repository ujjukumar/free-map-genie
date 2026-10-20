import "fake-indexeddb/auto";

import { Storage } from "happy-dom";
import { afterEach } from "vitest";

// Node >= 25 ships its own Web Storage global, which is undefined unless
// --localstorage-file is set and shadows happy-dom's implementation.
if (typeof globalThis.localStorage === "undefined") {
  Object.defineProperty(globalThis, "localStorage", {
    value: new Storage(),
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  localStorage.clear();
});
