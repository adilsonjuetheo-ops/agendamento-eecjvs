import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./index";
import * as dotenv from "dotenv";
dotenv.config();

async function runMigrations() {
  console.log("Executando migrações...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrações concluídas!");
  await pool.end();
}

runMigrations().catch((err) => {
  console.error("Erro nas migrações:", err);
  process.exit(1);
});
