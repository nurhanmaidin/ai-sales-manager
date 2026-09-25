// Dev fallback for machines without Docker: runs a real PostgreSQL server from
// the `embedded-postgres` package using the same credentials and port as
// docker-compose.yml, so DATABASE_URL in .env works unchanged.
//
//   npm run db:local        (leave running in its own terminal)

import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const dataDir = path.resolve(".local-db");
const firstRun = !existsSync(path.join(dataDir, "PG_VERSION"));

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "aisales",
  password: "aisales",
  port: 5432,
  persistent: true,
});

async function main() {
  if (firstRun) await pg.initialise();
  await pg.start();
  if (firstRun) await pg.createDatabase("ai_sales_manager");
  console.log("PostgreSQL running on localhost:5432 (database: ai_sales_manager). Ctrl+C to stop.");
}

async function shutdown() {
  await pg.stop();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch(async (error) => {
  console.error(error);
  await pg.stop().catch(() => {});
  process.exit(1);
});
