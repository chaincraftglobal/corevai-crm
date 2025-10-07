import puppeteer, { Browser, Page } from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export async function launchBrowser(): Promise<Browser> {
  const execPath =
    process.env.PUPPETEER_EXECUTABLE_PATH || (await chromium.executablePath());

  return puppeteer.launch({
    executablePath: execPath,
    args: chromium.args,
    headless: true,
    ignoreHTTPSErrors: true,
  } as any);
}

/** Small helper to pause without relying on deprecated page.waitForTimeout */
export function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Minimal “login only” validator.
 * Only checks that the login form exists, submits it, and confirms a post-login element.
 */
export async function validateCredentials(
  loginUrl: string,
  username: string,
  password: string
): Promise<{ ok: boolean; message: string; screenshot: string }> {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  try {
    // Make network a bit more tolerant in serverless
    await page.setDefaultNavigationTimeout(120_000);
    await page.setDefaultTimeout(120_000);

    await page.goto(loginUrl, { waitUntil: "domcontentloaded" });

    // Try common username/password selectors used by many portals
    const userSel = ["input[name='username']", "#username", "input[type='email']"].join(", ");
    const passSel = ["input[name='password']", "#password", "input[type='password']"].join(", ");
    const submitSel = ["button[type='submit']", "button:has-text('Login')", "input[type='submit']"].join(", ");

    // Wait for username input to appear
    await page.waitForSelector(userSel, { timeout: 60_000 });
    await page.type(userSel, username, { delay: 20 });

    // Wait for password input to appear
    await page.waitForSelector(passSel, { timeout: 60_000 });
    await page.type(passSel, password, { delay: 20 });

    // Click submit (fallback to pressing Enter)
    const submitBtn = await page.$(submitSel);
    if (submitBtn) {
      await submitBtn.click();
    } else {
      await page.keyboard.press("Enter");
    }

    // Wait for either an error message or a post-login app shell
    // (adjust selectors to the real app as needed)
    const postLogin =
      (await Promise.race([
        page.waitForSelector("#menu, nav, .sidebar, [data-dashboard]", { timeout: 60_000 }),
        page.waitForSelector(".error, [role='alert'], .alert, .invalid-feedback", { timeout: 60_000 }),
      ])) || null;

    // If we matched an alert/error element, treat as invalid
    const isError = postLogin
      ? await postLogin.evaluate((el) => {
        const t = (el.textContent || "").toLowerCase();
        return t.includes("invalid") || t.includes("error") || t.includes("failed");
      })
      : false;

    // Grab a screenshot (base64) for UI feedback
    const screenshot = await page.screenshot({ encoding: "base64", fullPage: true });

    if (isError) {
      return { ok: false, message: "Invalid credentials or portal error", screenshot: `data:image/png;base64,${screenshot}` };
    }

    return { ok: true, message: "Authenticated successfully", screenshot: `data:image/png;base64,${screenshot}` };
  } catch (err: any) {
    const screenshot = await page.screenshot({ encoding: "base64", fullPage: true }).catch(() => "");
    return {
      ok: false,
      message: err?.message || "Login validation failed",
      screenshot: screenshot ? `data:image/png;base64,${screenshot}` : "",
    };
  } finally {
    await browser.close().catch(() => { });
  }
}
