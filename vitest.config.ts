import { defineConfig, loadEnv } from "vite";
import path from "node:path";

// Service tests run against a real PostgreSQL schema ("vitest") that is reset
// before each run, so tenant isolation and transactions are tested for real.
const env = loadEnv("test", process.cwd(), "");
const baseUrl =
  env.DATABASE_URL ?? "postgresql://aisales:aisales@localhost:5432/ai_sales_manager?schema=public";
const testUrl = baseUrl.replace(/schema=[^&]+/, "schema=vitest");

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    globalSetup: ["tests/unit/global-setup.ts"],
    env: { DATABASE_URL: testUrl, TZ: "Asia/Kuala_Lumpur", AI_PROVIDER: "mock" },
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
