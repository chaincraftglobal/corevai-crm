// src/server/virtual-tracker/cron.ts

import { schedule, ScheduledTask } from "node-cron";
import { listAccounts } from "./store";
import { runAccount } from "./runner";
import type { VTAccount } from "@/types/virtual-tracker";

/**
 * Registry of active cron jobs keyed by account name.
 */
const jobs = new Map<string, ScheduledTask>();

/**
 * Map preset → cron expression.
 * If `presetOrCron` already looks like a cron (has 4+ spaces),
 * we treat it as a raw cron and return it unchanged.
 */
function resolveCronExpression(presetOrCron?: string): string {
  if (!presetOrCron) return "0 * * * *"; // hourly default

  // Heuristic: raw cron expressions contain multiple spaces
  if (presetOrCron.trim().split(/\s+/).length >= 5) {
    return presetOrCron.trim();
  }

  switch (presetOrCron) {
    case "every_15m":
      return "*/15 * * * *";
    case "every_30m":
      return "*/30 * * * *";
    case "every_1h":
      return "0 * * * *";
    case "every_2h":
      return "0 */2 * * *";
    case "every_3h":
      return "0 */3 * * *";
    case "every_6h":
      return "0 */6 * * *";
    case "every_9h":
      return "0 */9 * * *";
    case "every_12h":
      return "0 */12 * * *";
    case "every_24h":
      return "0 0 * * *"; // midnight daily
    case "every_48h":
      return "0 0 */2 * *"; // every 2 days at midnight
    case "every_3d":
      return "0 0 */3 * *"; // every 3 days at midnight
    case "daily_9am":
      return "0 9 * * *"; // 09:00 daily
    case "weekly":
      return "0 9 * * MON"; // Monday 09:00
    case "monthly":
      return "0 9 1 * *"; // 1st of month 09:00
    default:
      // Fallback: hourly
      return "0 * * * *";
  }
}

/**
 * Register and start cron for a specific account.
 * Stops any existing job for that account first.
 */
export async function registerCronForAccount(account: VTAccount) {
  const name = account.name;
  const expression = resolveCronExpression(account.schedule);

  // Stop existing job (if any)
  const existing = jobs.get(name);
  if (existing) {
    existing.stop();
    jobs.delete(name);
  }

  // Create the scheduled job
  const job = schedule(expression, async () => {
    const started = new Date().toISOString();
    console.log(`[CRON] ▶ Run ${name} @ ${started} (${expression})`);
    try {
      await runAccount(account);
      console.log(`[CRON] ✅ ${name} run complete`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[CRON] ❌ ${name} run failed: ${msg}`);
    }
  });

  jobs.set(name, job);
  console.log(`[CRON] Registered job for "${name}" (${expression})`);
}

/**
 * Unregister (stop & remove) cron job for an account by name.
 */
export function unregisterCronForAccount(name: string) {
  const job = jobs.get(name);
  if (job) {
    job.stop();
    jobs.delete(name);
    console.log(`[CRON] Unregistered job for "${name}"`);
  }
}

/**
 * Restart cron job for an account (use after settings update).
 */
export async function restartCronForAccount(account: VTAccount) {
  unregisterCronForAccount(account.name);
  await registerCronForAccount(account);
}

/**
 * Initialize cron jobs for all accounts on server boot.
 */
export async function initAllCrons() {
  try {
    const accounts = await listAccounts();
    for (const acc of accounts) {
      await registerCronForAccount(acc);
    }
    console.log(`[CRON] Initialized ${accounts.length} account jobs`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[CRON] Failed to initialize: ${msg}`);
  }
}
