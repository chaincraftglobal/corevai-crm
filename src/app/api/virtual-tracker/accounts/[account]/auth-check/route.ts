import { NextRequest, NextResponse } from "next/server";
import { checkAuthForAccount } from "@/server/virtual-tracker/validate";

/**
 * POST /api/virtual-tracker/accounts/[account]/auth-check
 * Validates stored credentials for the given account name.
 */
export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ account: string }> }
) {
  const { account } = await context.params;

  const result = await checkAuthForAccount(account);
  if (result.ok) {
    return NextResponse.json({
      ok: true,
      message: result.message,
      screenshot: result.screenshot ?? null,
    });
  }

  return NextResponse.json(
    { ok: false, error: result.message || "Validation failed" },
    { status: 400 }
  );
}
