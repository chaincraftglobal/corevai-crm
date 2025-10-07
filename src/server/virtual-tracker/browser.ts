// src/server/virtual-tracker/browser.ts
import fs from "fs";
import path from "path";
import puppeteer, { Browser, Page } from "puppeteer-core";

/** ──────────────────────────────────────────────────────────────
 *  Utility: resolve Chrome/Chromium executable
 *  1) Env PUPPETEER_EXECUTABLE_PATH
 *  2) Common macOS / Linux / Homebrew locations
 *  ────────────────────────────────────────────────────────────── */
function resolveChromeExecutable(): string {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (fromEnv && fs.existsSync(fromEnv)) {
    console.log("[Browser] Using PUPPETEER_EXECUTABLE_PATH:", fromEnv);
    return fromEnv;
  }

  const candidates = [
    // macOS
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    // Homebrew (Apple Silicon / Intel)
    "/opt/homebrew/bin/chromium",
    "/opt/homebrew/bin/google-chrome",
    "/usr/local/bin/chromium",
    "/usr/local/bin/google-chrome",
    // Linux
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      console.log("[Browser] Auto-detected Chrome at:", p);
      return p;
    }
  }

  throw new Error(
    "Could not find a Chrome/Chromium executable. Set PUPPETEER_EXECUTABLE_PATH in .env or install Chrome."
  );
}

/** ──────────────────────────────────────────────────────────────
 *  Launch Puppeteer
 *  headless: from env PUPPETEER_HEADLESS (default true in server)
 *  ────────────────────────────────────────────────────────────── */
export async function launchBrowser(forceHeadless?: boolean): Promise<Browser> {
  const executablePath = resolveChromeExecutable();
  const headlessEnv = process.env.PUPPETEER_HEADLESS?.toLowerCase();
  const headless =
    typeof forceHeadless === "boolean"
      ? forceHeadless
      : headlessEnv === "false"
        ? false
        : true;

  const args = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
  ];

  console.log(
    `[Browser] Launching Chrome (headless=${headless}) at ${executablePath}`
  );

  const browser = await puppeteer.launch({
    executablePath,
    headless,
    args,
    // increase a little; we add explicit timeouts in calls too
    protocolTimeout: 120_000,
  });

  return browser;
}

/** ──────────────────────────────────────────────────────────────
 *  Screenshot helper (type-safe path with .png suffix)
 *  ────────────────────────────────────────────────────────────── */
export async function takeScreenshot(page: Page, filePath: string): Promise<string> {
  const ensureDir = path.dirname(filePath);
  if (!fs.existsSync(ensureDir)) fs.mkdirSync(ensureDir, { recursive: true });

  const withPng = filePath.endsWith(".png") ? filePath : `${filePath}.png`;
  // TS wants a template literal type like `${string}.png`
  const typedPath = withPng as `${string}.png`;

  await page.screenshot({ path: typedPath });
  return typedPath;
}

/** ──────────────────────────────────────────────────────────────
 *  Login flow for eVirtualPay
 *  Returns a live Page. Caller is responsible to close browser/page.
 *  ────────────────────────────────────────────────────────────── */
export async function loginEVirtualPay(
  browser: Browser,
  loginUrl: string,
  username: string,
  password: string,
  opts?: { timeout?: number }
): Promise<{ page: Page; loginScreenshot?: string }> {
  const timeout = opts?.timeout ?? 120_000;

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(timeout);
  page.setDefaultTimeout(timeout);

  // A little safer DNS wait (optional)
  const resolveDns = process.env.PUPPETEER_DNS_RESOLVE === "true";
  if (resolveDns) {
    try {
      await page.setRequestInterception(true);
      page.on("request", (req) => req.continue());
      // Turn off interception right after first navigation starts
      setTimeout(() => page.setRequestInterception(false).catch(() => { }), 2000);
    } catch { }
  }

  await page.goto(loginUrl, { waitUntil: "networkidle2", timeout });

  // Try flexible selectors for email/username field
  const emailSel =
    (await page.$("input[name='email']")) ||
    (await page.$("#email")) ||
    (await page.$("input[name='username']")) ||
    (await page.$("#username"));

  const passSel =
    (await page.$("input[name='password']")) || (await page.$("#password"));

  if (!emailSel || !passSel) {
    const screenshotPath = await takeScreenshot(
      page,
      path.join(process.cwd(), "screenshots", `login-missing-fields-${Date.now()}`)
    );
    throw new Error(
      `Login fields not found. Saved screenshot: ${screenshotPath}`
    );
  }

  await emailSel.click({ clickCount: 3 });
  await emailSel.type(username, { delay: 40 });
  await passSel.click({ clickCount: 3 });
  await passSel.type(password, { delay: 40 });

  // submit button guesses
  const submitBtn =
    (await page.$("button[type='submit']")) ||
    (await page.$("#login")) ||
    (await page.$(".btn-primary")) ||
    (await page.$("button"));

  if (!submitBtn) {
    const screenshotPath = await takeScreenshot(
      page,
      path.join(process.cwd(), "screenshots", `login-no-button-${Date.now()}`)
    );
    throw new Error(`Login button not found. Saved screenshot: ${screenshotPath}`);
  }

  // Click and wait for a navigation or content change
  await Promise.all([
    submitBtn.click(),
    page.waitForNavigation({ waitUntil: "networkidle2", timeout }).catch(() => null),
  ]);

  // Post-login heuristic: look for common failure text
  const html = await page.content();
  const failed =
    /invalid|incorrect|unauthorized|error|fail/i.test(html) &&
    !/dashboard|transactions|welcome/i.test(html);

  const loginScreenshot = await takeScreenshot(
    page,
    path.join(process.cwd(), "screenshots", `login-after-submit-${Date.now()}`)
  );

  if (failed) {
    throw new Error(
      `Login appears to have failed. Check screenshot: ${loginScreenshot}`
    );
  }

  return { page, loginScreenshot };
}

/** ──────────────────────────────────────────────────────────────
 *  Extract rows on a typical "Today's transactions" table
 *  Tries multiple table selectors and common "no data" markers.
 *  ────────────────────────────────────────────────────────────── */
export async function extractRows(page: Page): Promise<
  { rows: any[]; noData: boolean; screenshot?: string }
> {
  // Try to find a table quickly
  const tableSel = [
    "table",
    "table.table",
    "#transactions table",
    ".dataTables_wrapper table",
  ].join(", ");

  // Either a data table appears, or a "no data" badge/paragraph
  await Promise.race([
    page.waitForSelector(tableSel, { timeout: 20_000 }).catch(() => null),
    page
      .waitForSelector(
        "text/No data|text/No data available|text/No records|.empty, .no-data, #no-data",
        { timeout: 20_000 }
      )
      .catch(() => null),
  ]);

  // Check "no data" markers by content
  const content = await page.content();
  const noData =
    /No data available|No data|No records|Nothing found/i.test(content);

  // Try to parse some rows (best-effort)
  let rows: any[] = [];
  const table = await page.$(tableSel);
  if (table) {
    rows = await page.$$eval(`${tableSel} tbody tr`, (els) =>
      els.map((tr) =>
        Array.from(tr.querySelectorAll("td")).map((td) =>
          (td.textContent || "").trim()
        )
      )
    );
  }

  const screenshot = await takeScreenshot(
    page,
    path.join(process.cwd(), "screenshots", `rows-${Date.now()}`)
  );

  return { rows, noData, screenshot };
}

/** ──────────────────────────────────────────────────────────────
 *  Validate credentials quickly (used by /validate endpoints)
 *  Options: timeout (ms), retryOnce (bool)
 *  ────────────────────────────────────────────────────────────── */
export async function validateCredentials(
  loginUrl: string,
  username: string,
  password: string,
  options?: { timeout?: number; retryOnce?: boolean }
): Promise<{ ok: boolean; message: string; screenshot?: string }> {
  const { timeout = 180_000, retryOnce = false } = options || {};

  let browser: Browser | null = null;
  try {
    browser = await launchBrowser(true);
    const { page, loginScreenshot } = await loginEVirtualPay(
      browser,
      loginUrl,
      username,
      password,
      { timeout }
    );

    // On success, try to confirm we're on an app page (not still at login)
    const html = await page.content();
    const looksLoggedIn = /dashboard|transactions|welcome|merchant/i.test(html);
    const screenshot = loginScreenshot;

    await page.close();
    await browser.close();

    if (!looksLoggedIn) {
      if (retryOnce) {
        console.warn("[Browser] Login uncertain, retrying once...");
        return validateCredentials(loginUrl, username, password, {
          timeout,
          retryOnce: false,
        });
      }
      return {
        ok: false,
        message: "Login may have failed (no dashboard markers found).",
        screenshot,
      };
    }

    return { ok: true, message: "Login successful", screenshot };
  } catch (err: any) {
    if (browser) {
      try {
        await browser.close();
      } catch { }
    }
    if (retryOnce) {
      console.warn("[Browser] validateCredentials failed, retrying once…", err?.message);
      return validateCredentials(loginUrl, username, password, {
        timeout,
        retryOnce: false,
      });
    }
    return { ok: false, message: err?.message || "Validation error" };
  }
}