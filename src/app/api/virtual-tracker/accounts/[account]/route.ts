import { NextRequest, NextResponse } from "next/server";
import { getAccountByName, updateAccount } from "@/server/virtual-tracker/store";
import { registerCronForAccount } from "@/server/virtual-tracker/cron";

/**
 * Handles GET and PUT for a single Virtual Tracker account.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ account: string }> }
) {
  const { account } = await context.params; // ✅ Await the promise (Turbopack fix)
  const found = await getAccountByName(account);

  if (!found) {
    return NextResponse.json({ ok: false, error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, account: found });
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ account: string }> }
) {
  const { account } = await context.params;
  const data = await req.json();

  const updated = await updateAccount(account, data);
  if (!updated) {
    return NextResponse.json({ ok: false, error: "Account not found" }, { status: 404 });
  }

  // re-register cron with new settings
  await registerCronForAccount(updated);

  return NextResponse.json({ ok: true, account: updated });
}
