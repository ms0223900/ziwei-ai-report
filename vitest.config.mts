import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": path.resolve(import.meta.dirname, "test/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    clearMocks: true,
    restoreMocks: true,
    include: ["**/*.test.ts", "**/*.test.tsx"],
  },
});
