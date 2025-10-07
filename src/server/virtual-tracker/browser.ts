// src/server/virtual-tracker/browser.ts
import puppeteer, { Browser } from "puppeteer-core";

/**
 * Launch a Chromium that works on both local dev and Vercel (serverless).
 * - Local: set PUPPETEER_EXECUTABLE_PATH (Chrome/Chromium path)
 * - Vercel: relies on @sparticuz/chromium
 */
export async function launchBrowser(): Promise<Browser> {
  // Use dynamic import to sidestep TS type gaps on Sparticuz exports
  const chromium: any = await import("@sparticuz/chromium");

  const localPath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  const lambdaPath =
    typeof chromium.executablePath === "function"
      ? await chromium.executablePath()
      : (chromium.executablePath as string | undefined);

  const executablePath = localPath && localPath.length > 0 ? localPath : lambdaPath;

  if (!executablePath) {
    throw new Error(
      "Could not find a Chrome/Chromium executable. " +
        "Set PUPPETEER_EXECUTABLE_PATH (local) or ensure @sparticuz/chromium is available (Vercel)."
    );
  }

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    // Sparticuz provides sane defaults in chromium.args, but guard if missing
    args:
      (chromium && chromium.args) ||
      [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--no-zygote",
        "--disable-dev-shm-usage",
      ],
  });

  return browser;
}

type ValidateOpts = {
  timeout?: number;   // per navigation step
  retryOnce?: boolean;
};

/**
 * Minimal login validator: tries to log into the portal and confirms we’re past the login screen.
 * Returns a base64 screenshot string for UI feedback.
 */
export async function validateCredentials(
  loginUrl: string,
  username: string,
  password: string,
  opts: ValidateOpts = {}
): Promise<{ ok: boolean; message: string; screenshot: string }> {
  const timeout = opts.timeout ?? 120_000; // 2 min default

  const attempt = async (): Promise<{ ok: boolean; message: string; screenshot: string }> => {
    const browser = await launchBrowser();
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(timeout);
    page.setDefaultTimeout(timeout);

    try {
      // 1) Go to login page
      await page.goto(loginUrl, { waitUntil: "domcontentloaded", timeout });

      // 2) Find fields (cover common variants)
      const userSel = "input[name='username'], #username, input[type='email'], input[name='email']";
      const passSel = "input[name='password'], #password, input[type='password']";
      const btnSel =
        "button[type='submit'], input[type='submit'], #login, .btn-primary, button:has-text('Login')";

      const userEl = await page.$(userSel);
      const passEl = await page.$(passSel);
      if (!userEl || !passEl) {
        const screenshot = await page.screenshot({ type: "png", encoding: "base64" });
        throw new Error(`Waiting for selector \`${userSel}\` or \`${passSel}\` failed`);
      }

      await userEl.click({ delay: 20 });
      await page.keyboard.type(username, { delay: 10 });
      await passEl.click({ delay: 20 });
      await page.keyboard.type(password, { delay: 10 });

      const btn = await page.$(btnSel);
      if (!btn) {
        const screenshot = await page.screenshot({ type: "png", encoding: "base64" });
        throw new Error(`Could not find submit button (\`${btnSel}\`)`);
      }

      // 3) Submit and wait for navigation / login resolution
      const navPromise = page.waitForNavigation({ waitUntil: "domcontentloaded", timeout }).catch(() => null);
      await Promise.all([btn.click(), navPromise]);

      // 4) Heuristic: if the URL still contains 'login' (or same origin & same path), assume fail
      const url = page.url();
      const looksLoggedIn = !/login/i.test(url);

      const screenshot = await page.screenshot({ type: "png", encoding: "base64" });

      if (!looksLoggedIn) {
        return {
          ok: false,
          message: "Login still on the login page. Check credentials.",
          screenshot,
        };
      }

      return {
        ok: true,
        message: "Authenticated successfully.",
        screenshot,
      };
    } finally {
      await page.close().catch(() => {});
      await browser.close().catch(() => {});
    }
  };

  try {
    return await attempt();
  } catch (err: any) {
    if (opts.retryOnce) {
      // brief backoff without relying on page.waitForTimeout (which may not exist in some typings)
      await new Promise((r) => setTimeout(r, 1500));
      return attempt();
    }
    const msg = err?.message || "Validation failed";
    return { ok: false, message: msg, screenshot: "" };
  }
}