import { NextResponse } from "next/server";
import { db } from "@/lib/db";

console.log("ENV TEST:", {
  cwd: process.cwd(),
  fix: process.env.IDOR_SECURITY_FIX,
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const orderId = Number(id);

  if (!Number.isInteger(orderId)) {
    return NextResponse.json(
      { error: "Invalid order ID" },
      { status: 400 }
    );
  }

  const currentUserId = request.headers.get("X-User-ID");

  if (!currentUserId) {
    return NextResponse.json(
      { error: "Missing X-User-ID header" },
      { status: 401 }
    );
  }

  const order = await db.orm.public.Order
    .where({ id: orderId })
    .first();

  if (!order) {
    return NextResponse.json(
      { error: "Order not found" },
      { status: 404 }
    );
  }

  console.log(
    "IDOR_SECURITY_FIX:",
    process.env.IDOR_SECURITY_FIX
  );

  console.log("DEBUG IDOR:", {
    env: process.env.IDOR_SECURITY_FIX,
    currentUserId,
    orderUserId: order.userId,
  });

  const securityFixEnabled =
    process.env.IDOR_SECURITY_FIX === "true";

  if (securityFixEnabled && order.userId !== currentUserId) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  return NextResponse.json(order);
}