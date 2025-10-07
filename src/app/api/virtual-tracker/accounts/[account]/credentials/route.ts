import { NextRequest, NextResponse } from "next/server";
import { updateAccount } from "@/server/virtual-tracker/store";

// ✅ Final fix — supports Next.js 15 (Turbopack) "Promise<{ params }>" signature
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ account: string }> }
): Promise<Response> {
  // Wait for params to resolve (fixes build type check)
  const { account } = await context.params;
  const body = await request.json();
  const { username, password, loginUrl } = body;

  if (!username || !password) {
    return NextResponse.json(
      { ok: false, error: "Username and password are required" },
      { status: 400 }
    );
  }

  const updated = await updateAccount(account, { username, password, loginUrl });

  if (!updated) {
    return NextResponse.json({ ok: false, error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, account: updated });
}
