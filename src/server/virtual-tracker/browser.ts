// src/server/virtual-tracker/browser.ts
import fs from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import type { LaunchOptions, Browser, Page } from "puppeteer-core";

type ValidateOptions = {
  timeout?: number;
  retryOnce?: boolean;
};

const isServerless =
  !!process.env.VERCEL ||
  !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.NODE_ENV === "production";

async function resolveExecutablePath(): Promise<string | undefined> {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  if (isServerless) {
    const p = await chromium.executablePath();
    return p;
  }

  const candidates = [
    "/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  for (const p of candidates) {
    try {
      await fs.access(p);
      return p;
    } catch { }
  }
  return undefined;
}

export async function launchBrowser(): Promise<Browser> {
  const executablePath = await resolveExecutablePath();

  const headless = isServerless
    ? true
    : (process.env.PUPPETEER_HEADLESS ?? "true").toLowerCase() !== "false";

  const launchOpts: LaunchOptions = {
    headless,
    executablePath,
    args: isServerless ? chromium.args : ["--no-sandbox", "--disable-dev-shm-usage"],
  };

  if (isServerless && !executablePath) {
    throw new Error(
      "Serverless: chromium.executablePath() returned empty. Ensure '@sparticuz/chromium' is installed in dependencies and the build ran."
    );
  }

  console.log("[browser] Launch:", {
    env: isServerless ? "serverless" : "local",
    headless,
    executablePath,
  });

  return puppeteer.launch(launchOpts);
}

/**
 * Helper for small delays (replaces removed page.waitForTimeout)
 */
async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for any selector among several
 */
async function waitForAnySelector(page: Page, selectors: string[], timeout: number) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    for (const sel of selectors) {
      const el = await page.$(sel);
      if (el) return sel;
    }
    await delay(200);
  }
  throw new Error(`Timeout: none of [${selectors.join(", ")}] appeared`);
}

/**
 * Validate login credentials only (no transaction extraction)
 */
export async function validateCredentials(
  loginUrl: string,
  username: string,
  password: string,
  opts: ValidateOptions = {}
): Promise<{ ok: boolean; message: string; screenshot: string }> {
  const timeout = opts.timeout ?? 120_000;

  async function attempt() {
    const browser = await launchBrowser();
    const page = await browser.newPage();
    let screenshot = "";

    try {
      await page.goto(loginUrl, { waitUntil: "domcontentloaded", timeout });

      const userSel = await waitForAnySelector(
        page,
        ["input[name='username']", "#username", "input[name='email']", "#email"],
        20000
      );
      await page.type(userSel, username, { delay: 30 });

      const passSel = await waitForAnySelector(
        page,
        ["input[name='password']", "#password", "input[type='password']"],
        20000
      );
      await page.type(passSel, password, { delay: 30 });

      try {
        const btnSel = await waitForAnySelector(
          page,
          ["button[type='submit']", "input[type='submit']", "button:has-text('Login')"],
          8000
        );
        await page.click(btnSel);
      } catch {
        await page.keyboard.press("Enter");
      }

      // Wait post-login or timeout
      const start = Date.now();
      let success = false;
      while (Date.now() - start < 45000) {
        const dashboardSel = await page.$("nav, a[href*='dashboard'], div[class*='sidebar']");
        if (dashboardSel) {
          success = true;
          break;
        }
        await delay(500);
      }

      screenshot = await page.screenshot({ encoding: "base64" });
      await browser.close();

      return success
        ? { ok: true, message: "Authenticated successfully", screenshot }
        : { ok: false, message: "Login failed or dashboard not detected", screenshot };
    } catch (err: any) {
      try {
        screenshot = await page.screenshot({ encoding: "base64" });
      } catch { }
      await browser.close();
      return { ok: false, message: err.message || "Validation error", screenshot };
    }
  }

  const result = await attempt();
  if (!result.ok && opts.retryOnce) {
    console.warn("[browser] retrying once...");
    return attempt();
  }
  return result;
}

/**
 * Base64 screenshot helper
 */
export async function safeScreenshot(page: Page): Promise<string> {
  return page.screenshot({ encoding: "base64" });
}

/**
 * Save screenshot to file (safe for TS)
 */
export async function takeScreenshotToFile(page: Page, filePath: string): Promise<string> {
  const buf = await page.screenshot({ type: "png" });
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const fixed = filePath.endsWith(".png") ? filePath : `${filePath}.png`;
  await fs.writeFile(fixed, buf);
  return fixed;
}

/** Dummy placeholders */
export async function extractRows(): Promise<any[]> {
  return [];
}
export async function loginEVirtualPay(): Promise<void> { }
