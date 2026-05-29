import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resend, FROM } from "@/lib/resend";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, data } = body;

  if (type === "user.created") {
    // Org is created during onboarding, not here
  }

  if (type === "user.deleted") {
    await prisma.organization.deleteMany({ where: { clerkUserId: data.id } });
  }

  return NextResponse.json({ received: true });
}
