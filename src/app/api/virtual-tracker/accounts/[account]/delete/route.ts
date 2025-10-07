import { NextRequest, NextResponse } from "next/server";
import { getAccountByName, deleteAccount } from "@/server/virtual-tracker/store";
import { unregisterCronForAccount } from "@/server/virtual-tracker/cron";

/**
 * DELETE /api/virtual-tracker/accounts/[account]
 * Removes an account and stops its cron job.
 */
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ account: string }> }
) {
  // Turbopack sometimes wraps params in a Promise — await it:
  const { account } = await context.params;

  const found = await getAccountByName(account);
  if (!found) {
    return NextResponse.json({ ok: false, error: "Account not found" }, { status: 404 });
  }

  // stop cron if running
  await unregisterCronForAccount(account);

  // delete from store
  const removed = await deleteAccount(account);
  if (!removed) {
    return NextResponse.json({ ok: false, error: "Failed to delete account" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Deleted successfully" });
}
