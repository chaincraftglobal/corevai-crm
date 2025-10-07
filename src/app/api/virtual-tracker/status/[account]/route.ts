// src/app/api/virtual-tracker/status/[account]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getStatus } from "@/server/virtual-tracker/store";
import type { VTStatus } from "@/types/virtual-tracker";

/**
 * GET /api/virtual-tracker/status/[account]
 * Returns the latest known status for a specific account.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ account: string }> }
) {
  const { account } = await context.params;

  const status: VTStatus | null = await getStatus(account);

  if (!status) {
    return NextResponse.json(
      { ok: false, error: "Status not found for this account" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, status });
}
