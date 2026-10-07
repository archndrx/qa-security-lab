import { Temporal } from "@js-temporal/polyfill";
import "dotenv/config";
import fs from "fs";

(globalThis as any).Temporal = Temporal;

const { default: postgres } =
  await import("@prisma/orm-postgres/runtime");

const contractJson = JSON.parse(
  fs.readFileSync("./src/prisma/contract.json", "utf8")
);

export const db = postgres({
  contractJson,
  url: process.env.DATABASE_URL!,
});