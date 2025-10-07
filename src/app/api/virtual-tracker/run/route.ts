import { NextResponse } from "next/server";
import { listAccounts } from "@/server/virtual-tracker/store";
import { runAccount } from "@/server/virtual-tracker/runner";

export async function POST() {
  const accounts = await listAccounts();
  const results: any[] = [];

  for (const acc of accounts) {
    const res = await runAccount(acc);
    results.push({ account: acc.name, ...res });
  }

  return NextResponse.json({ ok: true, results });
}
