import fs from "fs/promises";
import path from "path";
import type { VTAccount, VTStatus, VTStore } from "@/types/virtual-tracker";

const isVercel = !!process.env.VERCEL;
const DATA_DIR =
  process.env.DATA_DIR ||
  (isVercel ? "/tmp/corevai-data" : path.join(process.cwd(), "data"));
const STORE_PATH = path.join(DATA_DIR, "virtual-tracker.json");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

/** Read the entire store.json */
export async function readStore(): Promise<VTStore> {
  await ensureDir();
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    return JSON.parse(raw) as VTStore;
  } catch {
    // first run
    return { accounts: [], statusByAccount: {} };
  }
}

/** Persist the entire store.json */
export async function writeStore(next: VTStore): Promise<void> {
  await ensureDir();
  await fs.writeFile(STORE_PATH, JSON.stringify(next, null, 2), "utf8");
}

/** Convenience: list all accounts */
export async function listAccounts(): Promise<VTAccount[]> {
  const store = await readStore();
  return store.accounts;
}

/** Get a single account by its `name` */
export async function getAccountByName(name: string): Promise<VTAccount | null> {
  const store = await readStore();
  const found = store.accounts.find((a) => a.name === name) || null;
  return found;
}

/** Create a new account (no duplicates by name) */
export async function createAccount(input: VTAccount): Promise<VTAccount> {
  const store = await readStore();
  if (store.accounts.some((a) => a.name === input.name)) {
    throw new Error(`Account '${input.name}' already exists`);
  }
  const acc: VTAccount = {
    // required
    name: input.name,
    username: input.username,
    password: input.password,
    // optional / defaults
    loginUrl: input.loginUrl ?? "https://evirtualpay.com/v2/vp_interface/login",
    schedule: input.schedule ?? "0 9 * * *",
    sendOnNoTransactions: !!input.sendOnNoTransactions,
    notifyOnRun: !!input.notifyOnRun,
    emailTo: input.emailTo ?? undefined,
    weeklyReport: !!input.weeklyReport,
    monthlyReport: !!input.monthlyReport,
    // last known
    lastRunAt: input.lastRunAt ?? undefined,
    result: input.result ?? "pending",
    rowsToday: input.rowsToday ?? 0,
    lastError: input.lastError ?? null,
    screenshotUrl: input.screenshotUrl ?? null,
  };

  store.accounts.push(acc);
  await writeStore(store);
  return acc;
}

/**
 * Update an account by name with a partial payload.
 * Returns the updated VTAccount or null if not found.
 */
export async function updateAccount(
  name: string,
  patch: Partial<VTAccount>
): Promise<VTAccount | null> {
  const store = await readStore();
  const idx = store.accounts.findIndex((a) => a.name === name);
  if (idx === -1) return null;

  const prev = store.accounts[idx];
  const next: VTAccount = {
    ...prev,
    ...patch,
  };

  // normalize booleans if provided
  if (typeof patch.sendOnNoTransactions !== "undefined") {
    next.sendOnNoTransactions = !!patch.sendOnNoTransactions;
  }
  if (typeof patch.notifyOnRun !== "undefined") {
    next.notifyOnRun = !!patch.notifyOnRun;
  }
  if (typeof patch.weeklyReport !== "undefined") {
    next.weeklyReport = !!patch.weeklyReport;
  }
  if (typeof patch.monthlyReport !== "undefined") {
    next.monthlyReport = !!patch.monthlyReport;
  }

  store.accounts[idx] = next;
  await writeStore(store);
  return next;
}

/** Delete an account by name (and its last status entry) */
export async function deleteAccount(name: string): Promise<boolean> {
  const store = await readStore();
  const before = store.accounts.length;
  store.accounts = store.accounts.filter((a) => a.name !== name);
  if (store.statusByAccount[name]) {
    delete store.statusByAccount[name];
  }
  await writeStore(store);
  return store.accounts.length < before;
}

/**
 * Update latest status for an account.
 * Accepts a full VTStatus object; merges onto store.statusByAccount[account].
 */
export async function setStatus(accountName: string, status: VTStatus): Promise<void> {
  const store = await readStore();
  const prev = store.statusByAccount[accountName] ?? { account: accountName };
  store.statusByAccount[accountName] = { ...prev, ...status, account: accountName };
  await writeStore(store);
}

/** Utility: set lastRunAt+result in one go (optional helper, not required) */
export async function setResult(
  accountName: string,
  result: VTStatus["result"],
  rowsToday?: number,
  error?: string | null,
  screenshotUrl?: string | null
) {
  await setStatus(accountName, {
    account: accountName,
    result,
    rowsToday,
    lastError: error ?? null,
    lastRunAt: new Date().toISOString(),
    screenshotUrl: screenshotUrl ?? null,
  });
}

/** Get last known status for an account */
export async function getStatus(accountName: string): Promise<VTStatus | null> {
  const store = await readStore();
  return store.statusByAccount[accountName] || null;
}
