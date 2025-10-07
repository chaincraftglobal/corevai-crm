import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

/**
 * Launches Chromium automatically:
 * - Uses Sparticuz Chromium in Vercel/AWS
 * - Falls back to local Chrome in development
 */
export async function launchBrowser() {
  // Get path for Vercel-compatible Chromium binary
  let executablePath = await chromium.executablePath();

  // 🧠 Local dev fallback (Mac / Linux)
  if (!executablePath) {
    executablePath =
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  }

  console.log("🚀 Launching browser from:", executablePath);

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath,
    headless:
      process.env.NODE_ENV === "production"
        ? true // always headless in Vercel
        : process.env.PUPPETEER_HEADLESS === "true",
  });

  return browser;
}

/**
 * Validate login credentials for eVirtualPay.
 * Only checks login success/failure.
 */
export async function validateCredentials(
  loginUrl: string,
  username: string,
  password: string
) {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  try {
    await page.goto(loginUrl, { waitUntil: "networkidle2", timeout: 120000 });

    await page.waitForSelector("input[name='username'], #username", {
      timeout: 30000,
    });
    await page.type("input[name='username'], #username", username, { delay: 50 });

    await page.waitForSelector("input[name='password'], #password", {
      timeout: 30000,
    });
    await page.type("input[name='password'], #password", password, { delay: 50 });

    await page.click("button[type='submit'], #login_button");
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 });

    const screenshot = await page.screenshot({ encoding: "base64" });
    return { ok: true, message: "Login successful", screenshot };
  } catch (err: any) {
    console.error("❌ Validation failed:", err);
    return { ok: false, message: `Validation failed: ${err.message}` };
  } finally {
    await browser.close();
  }
}