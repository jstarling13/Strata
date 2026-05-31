import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/anthropic";
import { normalizeCSVData } from "@/lib/agents/normalize";
import { parse } from "csv-parse/sync";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkUserId: userId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const text = await file.text();
  let rows: Record<string, string>[];
  try {
    rows = parse(text, { columns: true, skip_empty_lines: true, trim: true });
  } catch {
    return NextResponse.json({ error: "Invalid CSV" }, { status: 400 });
  }

  if (rows.length === 0) return NextResponse.json({ error: "Empty CSV" }, { status: 400 });

  const headers = Object.keys(rows[0]);
  const sample = rows.slice(0, 3);

  // Use Claude to auto-map columns
  const mapPrompt = `Given these CSV column headers: ${JSON.stringify(headers)}
Sample rows: ${JSON.stringify(sample)}

Map them to these fields (return JSON object, use null if not found):
{
  "amount": "column name for sale/transaction amount",
  "timestamp": "column name for transaction date/time",
  "staffId": "column name for staff/employee identifier (null if not present)",
  "customerId": "column name for customer identifier (null if not present)",
  "tip": "column name for tip amount (null if not present)"
}
Return only the JSON object.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    messages: [{ role: "user", content: mapPrompt }],
  });

  const mapText = response.content[0].type === "text" ? response.content[0].text : "{}";
  let columnMap: { amount: string; timestamp: string; staffId?: string; customerId?: string; tip?: string };
  try {
    const match = mapText.match(/\{[\s\S]*\}/);
    columnMap = match ? JSON.parse(match[0]) : null;
  } catch {
    return NextResponse.json({ error: "Could not parse column map" }, { status: 400 });
  }

  if (!columnMap?.amount || !columnMap?.timestamp) {
    return NextResponse.json({ error: "Could not identify required columns" }, { status: 400 });
  }

  // Return preview for confirmation
  if (formData.get("preview") === "true") {
    return NextResponse.json({ columnMap, rowCount: rows.length, sample: rows.slice(0, 5) });
  }

  // Save data source
  await prisma.dataSource.upsert({
    where: { id: `csv_${org.id}` },
    create: {
      id: `csv_${org.id}`,
      orgId: org.id,
      type: "csv",
      status: "active",
      lastSyncAt: new Date(),
    },
    update: { status: "active", lastSyncAt: new Date() },
  });

  // Normalize then run attribution in background
  (async () => {
    try {
      await normalizeCSVData(org.id, rows, columnMap as any);
      const { runAttribution } = await import("@/lib/agents/attribution");
      await runAttribution(org.id);
      await prisma.dataSource.update({
        where: { id: `csv_${org.id}` },
        data: { lastSyncAt: new Date(), status: "active" },
      });
      // Fire data-ready email on first successful sync
      const { maybeSendDataReadyEmail } = await import("@/lib/agents/data-ready");
      await maybeSendDataReadyEmail(org.id);
    } catch (e) {
      console.error("CSV attribution failed:", e);
      await prisma.dataSource.update({ where: { id: `csv_${org.id}` }, data: { status: "error" } });
    }
  })();

  return NextResponse.json({ ok: true, rowCount: rows.length });
}
