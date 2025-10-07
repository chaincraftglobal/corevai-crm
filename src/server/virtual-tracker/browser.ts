/**
 * CoreVAI Virtual Tracker - Browser Utility
 * ✅ Works locally (Mac/Windows/Linux) and in Vercel serverless
 * ✅ Uses puppeteer-core + @sparticuz/chromium for Lambda environments
 * ✅ Automatically detects Chrome/Chromium path
 */

import puppeteer, { type Browser, type Page } from "puppeteer-core";
import chromium from "@sparticuz/chromium";

// ---------------------------------------------------------------------------
// 🧩 Detect environment (Local vs Serverless)
// ---------------------------------------------------------------------------

const IS_SERVERLESS =
  process.env.VERCEL === "1" ||
  !!process.env.AWS_LAMBDA_FUNCTION_VERSION ||
  process.env.NODE_ENV === "production";

/**
 * Launch a Chromium or Chrome browser instance.
 * Automatically chooses the correct executable for the environment.
 */
export async function launchBrowser(): Promise<Browser> {
  const localExec = process.env.PUPPETEER_EXECUTABLE_PATH;
  const isLocal = process.env.NODE_ENV !== "production" && !!localExec;

  // --- 💻 Local Development Mode ------------------------------------------
  if (isLocal) {
    console.log("[Browser] Launching local Chrome at:", localExec);
    return puppeteer.launch({
      headless: false,
      executablePath: localExec,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      defaultViewport: { width: 1366, height: 900 },
    });
  }

  // --- ☁️ Serverless (Vercel / AWS Lambda) Mode ----------------------------
  const executablePath = await chromium.executablePath();

  if (!executablePath) {
    throw new Error(
      "❌ Could not find a valid Chromium executable path. Ensure @sparticuz/chromium is installed."
    );
  }

  console.log("[Browser] Launching serverless Chromium...");
  return puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      ...chromium.args,
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
    defaultViewport: { width: 1366, height: 900 },
  });
}

// ---------------------------------------------------------------------------
// 📸 Screenshot Helper
// ---------------------------------------------------------------------------

/**
 * Takes a screenshot and saves to `/tmp` (serverless-safe) or local dir.
 */
export async function takeScreenshot(
  page: Page,
  fileBase = "vt-screenshot"
): Promise<string> {
  const filePath =
    IS_SERVERLESS
      ? `/tmp/${fileBase}-${Date.now()}.png`
      : `./screenshots/${fileBase}-${Date.now()}.png`;

  await page.screenshot({
    path: filePath as `${string}.png`,
    fullPage: true,
    type: "png",
  });
  console.log(`[Browser] Screenshot saved at: ${filePath}`);
  return filePath;
}

// ---------------------------------------------------------------------------
// 🔐 Credential Validation (for /validate endpoint)
// ---------------------------------------------------------------------------

/**
 * Validates a login by attempting to sign in to eVirtualPay (or custom URL)
 * Returns success/failure + screenshot of the attempt.
 */
export async function validateCredentials(
  loginUrl: string,
  username: string,
  password: string
): Promise<{ ok: boolean; message: string; screenshot: string }> {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  try {
    console.log(`[Validate] Navigating to ${loginUrl}`);
    await page.goto(loginUrl, { waitUntil: "networkidle2", timeout: 180000 });

    // Wait for login inputs (supports multiple form types)
    await page.waitForSelector("input[name='username'], #username", {
      timeout: 30000,
    });
    await page.waitForSelector("input[name='password'], #password", {
      timeout: 30000,
    });

    // Fill form and submit
    await page.type("input[name='username'], #username", username, {
      delay: 50,
    });
    await page.type("input[name='password'], #password", password, {
      delay: 50,
    });
    await Promise.all([
      page.click("button[type='submit'], #login-button, .btn-primary"),
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }),
    ]);

    // Screenshot after login
    const screenshot = await takeScreenshot(page, "login-success");

    // Check if login was successful (basic heuristic)
    const success = !(
      (await page.$("input[name='password'], #password")) ||
      (await page.$(".error, .alert-danger"))
    );

    await browser.close();

    return {
      ok: success,
      message: success
        ? "✅ Authentication successful"
        : "❌ Invalid username or password",
      screenshot,
    };
  } catch (err: any) {
    console.error("[Validate] Login validation error:", err);
    const screenshot = await takeScreenshot(page, "login-error");
    await browser.close();
    return {
      ok: false,
      message: `❌ Validation failed: ${err.message || "Unknown error"}`,
      screenshot,
    };
  }
}
