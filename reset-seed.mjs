import { Temporal } from "@js-temporal/polyfill";
import "dotenv/config";
import fs from "fs";

globalThis.Temporal = Temporal;

const { default: postgres } = await import("@prisma/orm-postgres/runtime");

const contractJson = JSON.parse(
  fs.readFileSync("./src/prisma/contract.json", "utf8")
);

const db = postgres({
  contractJson,
  url: process.env.DATABASE_URL,
});

try {
  await db.orm.public.Finding.deleteAll();
  await db.orm.public.Order.deleteAll();
  await db.orm.public.Challenge.deleteAll();
  await db.orm.public.User.deleteAll();

  console.log("Database seed berhasil di-reset.");
} catch (error) {
  console.error("RESET ERROR:", error);
} finally {
  await db.close();
}