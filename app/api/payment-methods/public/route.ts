import { NextResponse } from "next/server";
import { getPublicPaymentMethods } from "@/lib/payment-methods";

export async function GET() {
  const methods = await getPublicPaymentMethods();
  return NextResponse.json({ methods });
}
