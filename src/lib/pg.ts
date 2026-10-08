import "dotenv/config";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as {
  pgPool?: Pool;
};

export const pgPool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pgPool;
}