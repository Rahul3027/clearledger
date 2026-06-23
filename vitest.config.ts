import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Run files matching these patterns
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Exclude Playwright / E2E tests (none in V1)
    exclude: ["node_modules", ".next"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/domain/**", "src/infrastructure/**"],
      exclude: ["src/**/*.test.ts", "src/app/**"],
    },
  },
  resolve: {
    alias: {
      // Match the @/* path alias from tsconfig.json
      "@": resolve(__dirname, "./src"),
    },
  },
});
