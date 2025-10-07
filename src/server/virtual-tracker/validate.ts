// src/server/virtual-tracker/validate.ts
import { getAccountByName } from "./store";
import { validateCredentials } from "./browser";

type AuthCheckResult = {
  ok: boolean;
  message: string;
  screenshot?: string; // always included when we have it
};

/**
 * Validates saved credentials for a specific account by performing a live login.
 * Uses higher timeouts and retries once (handled inside validateCredentials).
 */
export async function checkAuthForAccount(accountName: string): Promise<AuthCheckResult> {
  const account = await getAccountByName(accountName);
  if (!account) {
    return { ok: false, message: "Account not found" };
  }

  if (!account.username || !account.password) {
    return { ok: false, message: "Missing username or password" };
  }

  const loginUrl: string =
    account.loginUrl ||
    process.env.EVP_LOGIN_URL ||
    "https://evirtualpay.com/v2/vp_interface/login";

  try {
    // NOTE: validateCredentials must accept 4 params (loginUrl, username, password, options?)
    // Make sure your ./browser.ts signature matches:
    //   validateCredentials(loginUrl: string, username: string, password: string, options?: { timeout?: number; retryOnce?: boolean })
    const result = await validateCredentials(loginUrl, account.username, account.password);

    return {
      ok: result.ok,
      message: result.message,
      screenshot: result.screenshot, // path string (may be empty if none)
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Validation failed due to unexpected error";
    return { ok: false, message: msg };
  }
}
