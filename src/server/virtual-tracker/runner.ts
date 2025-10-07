import { setStatus, getAccountByName } from "./store";
import { loadEnvForAccount } from "./env-loader";
import { validateCredentials } from "./browser";
import { sendRunReport } from "./mailer";
import type { RunnerOutcome, VTAccount } from "@/types/virtual-tracker";

/**
 * Runs the validation and reporting process for a single Virtual Tracker account.
 */
export async function runAccount(account: VTAccount): Promise<RunnerOutcome> {
  console.log(`[Runner] Starting run for ${account.name}`);

  // ✅ loadEnvForAccount expects a string (account name), not the whole object
  const env = await loadEnvForAccount(account.name);

  // fallback to ensure we always have credentials
  const username = env.username ?? account.username;
  const password = env.password ?? account.password;
  const loginUrl =
    env.loginUrl ??
    account.loginUrl ??
    process.env.EVP_LOGIN_URL ??
    "https://evirtualpay.com/v2/vp_interface/login";

  if (!username || !password) {
    const msg = "Missing username or password";
    await setStatus(account.name, {
      account: account.name,
      lastRunAt: new Date().toISOString(),
      result: "fail",
      rowsToday: 0,
      lastError: msg,
      screenshotUrl: null,
    });
    return { ok: false, message: msg };
  }

  try {
    const result = await validateCredentials(loginUrl, username, password, {
      timeout: 240000, // 4 min
      retryOnce: true,
    });

    await setStatus(account.name, {
      account: account.name,
      lastRunAt: new Date().toISOString(),
      result: result.ok ? "success" : "fail",
      rowsToday: 0,
      lastError: result.ok ? null : result.message,
      screenshotUrl: result.screenshot ?? null,
    });

    if (account.notifyOnRun) {
      await sendRunReport({
        account: account.name,
        result: result.ok ? "success" : "fail",
        rowsToday: 0,
        lastRunAt: new Date().toISOString(),
        lastError: result.ok ? null : result.message,
        screenshotPath: result.screenshot ?? undefined,
        emailTo: account.emailTo ?? undefined,
      });
    }

    return { ok: result.ok, message: result.message };
  } catch (err: any) {
    const msg = err?.message ?? "Unexpected error";
    await setStatus(account.name, {
      account: account.name,
      lastRunAt: new Date().toISOString(),
      result: "fail",
      rowsToday: 0,
      lastError: msg,
      screenshotUrl: null,
    });
    return { ok: false, message: msg };
  }
}

/**
 * Convenience wrapper for cron and manual triggers
 */
export async function runAccountOnce(accountName: string): Promise<RunnerOutcome> {
  const account = await getAccountByName(accountName);
  if (!account) return { ok: false, message: "Account not found" };
  return runAccount(account);
}