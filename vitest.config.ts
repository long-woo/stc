import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts", "src/plugins/*/test/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 45000,
    hookTimeout: 45000,
    env: { STC_SKIP_UPDATE_CHECK: "1" },
  },
});
