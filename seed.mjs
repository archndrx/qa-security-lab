import { Temporal } from "@js-temporal/polyfill";
import "dotenv/config";
import fs from "fs";

globalThis.Temporal = Temporal;

const { default: postgres } =
  await import("@prisma/orm-postgres/runtime");

const contractJson = JSON.parse(
  fs.readFileSync("./src/prisma/contract.json", "utf8")
);

const db = postgres({
  contractJson,
  url: process.env.DATABASE_URL,
});

try {
  console.log("Seeding database...");

  const alice = await db.orm.public.User.create({
    id: "test-alice",
    email: "alice@lab.test",
    password: "password123",
    name: "Alice",
    isAdmin: false,
    isVerified: true,
  });

  console.log("✓ Alice created:", alice.id);

  const bob = await db.orm.public.User.create({
    id: "test-bob",
    email: "bob@lab.test",
    password: "password123",
    name: "Bob",
    isAdmin: false,
    isVerified: false,
  });

  console.log("✓ Bob created:", bob.id);

  const aliceMacbook = await db.orm.public.Order.create({
    id: 1,
    userId: alice.id,
    product: "MacBook",
    amount: 25000000,
  });

  const aliceKeyboard = await db.orm.public.Order.create({
    id: 2,
    userId: alice.id,
    product: "Keyboard",
    amount: 1000000,
  });

  const bobMonitor = await db.orm.public.Order.create({
    id: 3,
    userId: bob.id,
    product: "Monitor",
    amount: 3000000,
  });

  const bobMouse = await db.orm.public.Order.create({
    id: 4,
    userId: bob.id,
    product: "Mouse",
    amount: 500000,
  });

  console.log("✓ Orders created:", [
    aliceMacbook.id,
    aliceKeyboard.id,
    bobMonitor.id,
    bobMouse.id,
  ]);

  const raceCoupon = await db.orm.public.Coupon.create({
    id: "test-coupon-race-condition",
    code: "DISCOUNT50",
    discount: 50,
    maxUses: 1,
    usedCount: 0,
  });

  console.log("✓ Race Condition Coupon created:", raceCoupon.code);

  const idorChallenge = await db.orm.public.Challenge.create({
    id: "test-challenge-idor",
    title: "IDOR Challenge",
    slug: "idor",
    description: "Find unauthorized order access",
  });


  console.log("✓ IDOR Challenge created:", idorChallenge.id);

  const rateLimitChallenge = await db.orm.public.Challenge.create({
    id: "test-challenge-rate-limit",
    title: "Rate Limit Bypass Challenge",
    slug: "rate-limit",
    description:
      "Find an endpoint that allows unlimited authentication attempts.",
  });

  console.log(
    "✓ Rate Limit Challenge created:",
    rateLimitChallenge.id
  );

  const emailEnumerationChallenge = await db.orm.public.Challenge.create({
    id: "test-challenge-email-enumeration",
    title: "Email Enumeration Challenge",
    slug: "email-enumeration",
    description:
      "Find an endpoint that reveals whether an email address is registered.",
  });

  console.log(
    "✓ Email Enumeration Challenge created:",
    emailEnumerationChallenge.id
  );

  console.log("\n🎉 Seed berhasil!");
} catch (error) {
  console.error("\n❌ SEED ERROR:");
  console.error(error);
  process.exitCode = 1;
} finally {
  await db.close();
}