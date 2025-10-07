import { getAccountByName } from "./store";
import type { VTAccount } from "@/types/virtual-tracker";

/**
 * Load environment variables for a specific account.
 * Priority order:
 *  1️⃣ process.env (.env.local)
 *  2️⃣ Account overrides (from DB)
 *  3️⃣ Fallback defaults
 */
export async function loadEnvForAccount(
  accountName: string
): Promise<Partial<VTAccount> & { headless: boolean }> {
  const account = await getAccountByName(accountName);

  const headless =
    process.env.EVP_HEADLESS === "true" ||
    process.env.PUPPETEER_HEADLESS === "true";

  const env: Partial<VTAccount> & { headless: boolean } = {
    loginUrl:
      process.env.EVP_LOGIN_URL ??
      "https://evirtualpay.com/v2/vp_interface/login",
    username: process.env.EVP_USERNAME ?? undefined,
    password: process.env.EVP_PASSWORD ?? undefined,
    headless,
  };

  if (account) {
    env.username = account.username ?? env.username;
    env.password = account.password ?? env.password;
    env.loginUrl = account.loginUrl ?? env.loginUrl;
  }

  return env;
}