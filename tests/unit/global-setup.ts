import { execSync } from "node:child_process";
import { loadEnv } from "vite";

export default function setup() {
  // globalSetup does not receive `test.env`, so derive the test URL here and
  // refuse to run against anything other than the isolated "vitest" schema.
  const env = loadEnv("test", process.cwd(), "");
  const base =
    env.DATABASE_URL ??
    "postgresql://aisales:aisales@localhost:5432/ai_sales_manager?schema=public";
  const url = base.replace(/schema=[^&]+/, "schema=vitest");
  if (!/[?&]schema=vitest(&|$)/.test(url)) {
    throw new Error("Refusing to reset a database that is not the vitest schema.");
  }

  execSync("npx prisma db push --force-reset --skip-generate --accept-data-loss", {
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: url },
  });
}
