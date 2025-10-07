// src/app/api/virtual-tracker/accounts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { listAccounts, createAccount } from "@/server/virtual-tracker/store";
import { registerCronForAccount } from "@/server/virtual-tracker/cron";
import type { SchedulePreset } from "@/types/virtual-tracker";

/**
 * GET: List all tracker accounts.
 */
export async function GET() {
  const accounts = await listAccounts();
  return NextResponse.json({ ok: true, accounts });
}

/**
 * POST: Create a new tracker account and register its cron schedule.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      name,
      username,
      password,
      loginUrl,
      schedule,
      sendOnNoTransactions,
      notifyOnRun,
      emailTo,
      weeklyReport,
      weeklyMondayReport, // legacy support
      monthlyReport,
    } = body ?? {};

    // Basic validation
    if (!name || !username || !password) {
      return NextResponse.json(
        { ok: false, error: "name, username and password are required" },
        { status: 400 }
      );
    }

    // Normalize emailTo (null → undefined)
    const normalizedEmailTo: string | undefined = emailTo ?? undefined;

    // Normalize weekly flag (legacy support)
    const normalizedWeeklyReport: boolean | undefined =
      typeof weeklyReport === "boolean"
        ? weeklyReport
        : typeof weeklyMondayReport === "boolean"
        ? weeklyMondayReport
        : undefined;

    // Create the account
    const newAccount = await createAccount({
      name: String(name),
      username: String(username),
      password: String(password),
      loginUrl: loginUrl ? String(loginUrl) : undefined,
      schedule: schedule as SchedulePreset | string | undefined,
      sendOnNoTransactions:
        typeof sendOnNoTransactions === "boolean" ? sendOnNoTransactions : undefined,
      notifyOnRun:
        typeof notifyOnRun === "boolean" ? notifyOnRun : undefined,
      emailTo: normalizedEmailTo,
      weeklyReport: normalizedWeeklyReport,
      monthlyReport:
        typeof monthlyReport === "boolean" ? monthlyReport : undefined,
    });

    // Register cron after creation
    await registerCronForAccount(newAccount);

    return NextResponse.json({ ok: true, account: newAccount }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating account:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
