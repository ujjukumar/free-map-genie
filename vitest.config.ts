import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    include: ["src/**/*.test.ts", "modules/**/*.test.ts"],
    environment: "happy-dom",
    environmentOptions: {
      happyDOM: { url: "https://mapgenie.io/" },
    },
    setupFiles: ["./vitest.setup.ts"],
    restoreMocks: true,
  },
});
