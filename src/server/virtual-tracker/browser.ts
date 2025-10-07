// src/server/virtual-tracker/browser.ts
import puppeteer, { Browser } from "puppeteer-core";

/**
 * Launches a headless Chromium instance compatible with both:
 *  - Local dev (Mac/Windows/Linux)
 *  - Vercel serverless (using @sparticuz/chromium)
 */
export async function launchBrowser(): Promise<Browser> {
  // Dynamic import to avoid type resolution errors and bundler tree-shaking
  const chromium: any = await import("@sparticuz/chromium");

  // 1️⃣ Try local executable if specified (for Mac dev)
  const localPath = process.env.PUPPETEER_EXECUTABLE_PATH;

  // 2️⃣ Try the bundled path from Sparticuz on Vercel
  const lambdaPath =
    typeof chromium.executablePath === "function"
      ? await chromium.executablePath()
      : null;

  // 3️⃣ Fallback to whichever is available
  const executablePath = localPath && localPath.trim().length > 0
    ? localPath
    : lambdaPath;

  if (!executablePath) {
    throw new Error("No Chrome executable found. Set PUPPETEER_EXECUTABLE_PATH or use @sparticuz/chromium.");
  }

  // 4️⃣ Launch Puppeteer
  const browser = await puppeteer.launch({
    args: chromium.args || [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--no-zygote",
      "--disable-dev-shm-usage",
    ],
    executablePath,
    headless: true,
  });

  return browser;
}