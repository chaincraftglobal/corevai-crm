import { NextRequest, NextResponse } from "next/server";
import { checkAuthForAccount } from "@/server/virtual-tracker/validate";

/**
 * POST /api/virtual-tracker/accounts/[account]/validate
 * Validates stored credentials for an account.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ account: string }> }
) {
  const { account } = await context.params;

  try {
    const result = await checkAuthForAccount(account);

    if (result.ok) {
      return NextResponse.json({
        ok: true,
        message: result.message,
        screenshot: result.screenshot,
      });
    }

    return NextResponse.json(
      { ok: false, error: result.message },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Validation failed" },
      { status: 500 }
    );
  }
}
