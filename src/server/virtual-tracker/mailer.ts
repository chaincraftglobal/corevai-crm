import nodemailer from "nodemailer";
import { readStore } from "./store";

type DigestCadence = "daily" | "weekly" | "monthly";

function badgeColor(result?: string) {
  switch (result) {
    case "success":
      return "#16a34a"; // green
    case "no-data":
      return "#6b7280"; // gray
    case "fail":
      return "#dc2626"; // red
    default:
      return "#f59e0b"; // amber (pending/unknown)
  }
}

function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error("SMTP_USER and SMTP_PASS must be set in environment");
  }

  // Gmail service with app password (recommended)
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

function filterAccountsForCadence(cadence: DigestCadence) {
  if (cadence === "weekly") {
    // use correct field name from VTAccount
    return (acc: { weeklyReport?: boolean }) => !!acc.weeklyReport;
  }
  if (cadence === "monthly") {
    return (acc: { monthlyReport?: boolean }) => !!acc.monthlyReport;
  }
  return () => true;
}

function cadenceSubject(cadence: DigestCadence) {
  switch (cadence) {
    case "weekly":
      return "Virtual Tracker — Weekly Monday Digest";
    case "monthly":
      return "Virtual Tracker — Monthly Digest";
    default:
      return "Virtual Tracker — Daily Digest";
  }
}

/**
 * Digest email showing latest status for accounts filtered by cadence.
 */
export async function sendDailyDigest({ cadence = "daily" }: { cadence?: DigestCadence } = {}) {
  const store = await readStore();
  const filter = filterAccountsForCadence(cadence);
  const accounts = store.accounts.filter(filter);
  const rows = Object.values(store.statusByAccount || {}).filter((status) =>
    accounts.some((acc) => acc.name === status.account)
  );

  const htmlRows =
    rows.length > 0
      ? rows
        .map((r) => {
          const color = badgeColor(r.result);
          const result = (r.result ?? "pending").toString();
          const rowsToday = r.rowsToday ?? 0;
          const lastRun = r.lastRunAt ? new Date(r.lastRunAt).toLocaleString() : "—";
          const error = r.lastError ?? "—";
          return `
              <tr>
                <td style="padding:8px;border:1px solid #e5e7eb;">${r.account}</td>
                <td style="padding:8px;border:1px solid #e5e7eb;">
                  <span style="display:inline-block;padding:2px 8px;border-radius:999px;background:${color};color:#fff;text-transform:capitalize;">
                    ${result}
                  </span>
                </td>
                <td style="padding:8px;border:1px solid #e5e7eb;">${rowsToday}</td>
                <td style="padding:8px;border:1px solid #e5e7eb;">${lastRun}</td>
                <td style="padding:8px;border:1px solid #e5e7eb;">${error}</td>
              </tr>
            `;
        })
        .join("")
      : `<tr><td colspan="5" style="padding:12px;text-align:center;color:#6b7280;">No data yet.</td></tr>`;

  const html = `
    <div style="font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial;">
      <h2 style="margin:0 0 12px 0;">${cadenceSubject(cadence)}</h2>
      <table style="border-collapse:collapse;border:1px solid #e5e7eb;min-width:600px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Account</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Result</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Rows Today</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Last Run</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Error</th>
          </tr>
        </thead>
        <tbody>${htmlRows}</tbody>
      </table>
    </div>
  `;

  const transporter = getTransporter();

  const to = process.env.ADMIN_EMAIL || process.env.SMTP_USER!;
  await transporter.sendMail({
    from: `"Corevai CRM" <${process.env.SMTP_USER}>`,
    to,
    subject: cadenceSubject(cadence),
    html,
  });

  console.log(`[Mailer] ${cadenceSubject(cadence)} sent to:`, to);
}

/**
 * Per-run report email (optional) with screenshot attachment.
 */
export async function sendRunReport(params: {
  account: string;
  result: "success" | "no-data" | "fail" | "pending";
  rowsToday: number;
  lastRunAt: string; // ISO
  lastError?: string | null;
  screenshotPath?: string | null;
  emailTo?: string | null; // if null/undefined, falls back to ADMIN_EMAIL/SMTP_USER
}) {
  const transporter = getTransporter();

  const to = params.emailTo || process.env.ADMIN_EMAIL || process.env.SMTP_USER!;
  const color = badgeColor(params.result);
  const when = new Date(params.lastRunAt).toLocaleString();

  const html = `
    <div style="font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial;">
      <h3 style="margin:0 0 8px 0;">Run Report — ${params.account}</h3>
      <p style="margin:0 0 12px 0;color:#6b7280;">${when}</p>
      <p style="margin:0 0 12px 0;">
        Result:
        <span style="display:inline-block;padding:2px 8px;border-radius:999px;background:${color};color:#fff;text-transform:capitalize;">
          ${params.result}
        </span>
        &nbsp; • &nbsp; Rows Today: <b>${params.rowsToday}</b>
      </p>
      ${params.lastError ? `<p style="color:#dc2626;margin:0 0 12px 0;">Error: ${params.lastError}</p>` : ""}
      ${params.screenshotPath ? `<p style="margin:0;">Screenshot attached.</p>` : ""}
    </div>
  `;

  await transporter.sendMail({
    from: `"Corevai CRM" <${process.env.SMTP_USER}>`,
    to,
    subject: `VT Run — ${params.account} — ${params.result} (${params.rowsToday})`,
    html,
    attachments: params.screenshotPath
      ? [{ filename: "screenshot.png", path: params.screenshotPath }]
      : [],
  });

  console.log(`[Mailer] Run report sent for ${params.account} to ${to}`);
}
