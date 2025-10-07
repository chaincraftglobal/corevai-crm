import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import puppeteer from "puppeteer";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Health
app.get("/health", (_req, res) => res.json({ ok: true }));

// Minimal Gmail transporter (only if you want run reports from backend)
function getTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = String(process.env.SMTP_SECURE || "true") === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

// Just LOGIN VALIDATION — returns screenshot base64
app.post("/auth-check", async (req, res) => {
  const {
    loginUrl = process.env.EVP_LOGIN_URL || "https://evirtualpay.com/v2/vp_interface/login",
    username,
    password,
    timeoutMs = 120000,
  } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ ok: false, message: "Missing username/password" });
  }

  let browser: puppeteer.Browser | null = null;
  try {
    browser = await puppeteer.launch({
      headless: process.env.PUPPETEER_HEADLESS !== "false", // default true
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--window-size=1280,800",
      ],
    });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(timeoutMs);
    page.setDefaultTimeout(timeoutMs);

    await page.goto(loginUrl, { waitUntil: "networkidle2" });

    // Very loose selectors (handles most variants)
    const userSel = "input[name='username'], #username, input[type='email'], input[name='email']";
    const passSel = "input[name='password'], #password, input[type='password']";
    const btnSel = "button[type='submit'], button#login, button[name='login'], input[type='submit']";

    const userEl = await page.$(userSel);
    const passEl = await page.$(passSel);
    const btnEl = await page.$(btnSel);
    if (!userEl || !passEl || !btnEl) {
      throw new Error(`Login form not detected (username/pass/submit missing)`);
    }

    await userEl.click({ clickCount: 3 });
    await userEl.type(username, { delay: 10 });
    await passEl.click({ clickCount: 3 });
    await passEl.type(password, { delay: 10 });
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => null),
      (btnEl as any).click(),
    ]);

    // Heuristics: success if URL changed or dashboard keywords appear
    const html = await page.content();
    const url = page.url();
    const keywords = ["dashboard", "transactions", "merchant", "welcome", "logout"];
    const looksLoggedIn =
      keywords.some((k) => html.toLowerCase().includes(k)) || !/login/i.test(url);

    const screenshot = await page.screenshot({ type: "png", encoding: "base64" });

    if (looksLoggedIn) {
      return res.json({ ok: true, message: "Authenticated", screenshot });
    } else {
      return res.status(400).json({ ok: false, message: "Login likely failed", screenshot });
    }
  } catch (err: any) {
    return res.status(400).json({ ok: false, message: err?.message || "Auth check failed" });
  } finally {
    try {
      await browser?.close();
    } catch {}
  }
});

// OPTIONAL: a /run endpoint if you want to later send emails with screenshot
app.post("/run", async (req, res) => {
  const { loginUrl, username, password, emailTo } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ ok: false, message: "Missing creds" });

  // reuse the same flow as /auth-check
  const resp = await fetch(`http://127.0.0.1:${process.env.PORT || 3001}/auth-check`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ loginUrl, username, password }),
  })
    .then((r) => r.json())
    .catch((e) => ({ ok: false, message: String(e) }));

  // If you want to email:
  if (resp.ok && emailTo) {
    const tx = getTransporter();
    if (tx) {
      await tx
        .sendMail({
          from: `"Corevai Tracker" <${process.env.SMTP_USER}>`,
          to: emailTo,
          subject: `Auth OK — ${username}`,
          html: `<p>Authentication ok for <b>${username}</b></p>`,
          attachments: resp.screenshot
            ? [
                {
                  filename: "screenshot.png",
                  content: Buffer.from(resp.screenshot, "base64"),
                },
              ]
            : [],
        })
        .catch(() => {});
    }
  }
  return res.json(resp);
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`[vt-backend] listening on :${port}`);
});
