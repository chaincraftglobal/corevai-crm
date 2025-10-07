// src/types/virtual-tracker.ts

/**
 * Possible outcomes from a tracker run.
 */
export type VTRunResult = "success" | "fail" | "no-data" | "pending";

/**
 * Represents the available schedule presets for automation frequency.
 * Each preset is mapped to a cron expression in cron.ts.
 */
export type SchedulePreset =
  | "every_15m"
  | "every_30m"
  | "every_1h"
  | "every_2h"
  | "every_3h"
  | "every_6h"
  | "every_9h"
  | "every_12h"
  | "every_24h"
  | "every_48h"
  | "every_3d"
  | "daily_9am"
  | "weekly"
  | "monthly";

/**
 * Result returned by a tracker run.
 */
export type RunnerOutcome = {
  ok: boolean;
  message: string;
  rows?: any[];
};

/**
 * Represents a merchant / VirtualPay account.
 */
export interface VTAccount {
  /** Internal display name, e.g. "lacewing-technologies" */
  name: string;

  /** Login credentials */
  username: string;
  password: string;

  /** Optional custom portal login URL */
  loginUrl?: string;

  /** Cron expression or schedule preset */
  schedule?: SchedulePreset | string;

  /** Optional email + notification settings */
  sendOnNoTransactions?: boolean;
  notifyOnRun?: boolean;
  emailTo?: string;
  weeklyReport?: boolean;
  monthlyReport?: boolean;

  /** Latest status info */
  lastRunAt?: string;
  result?: VTRunResult;
  rowsToday?: number;
  lastError?: string | null;
  screenshotUrl?: string | null;
}

/**
 * Status snapshot for an account after last run.
 */
export interface VTStatus {
  account: string;
  lastRunAt?: string;
  result?: VTRunResult;
  rowsToday?: number;
  lastError?: string | null;
  screenshotUrl?: string | null;
}

/**
 * Shape of data persisted on disk.
 */
export interface VTStore {
  accounts: VTAccount[];
  statusByAccount: Record<string, VTStatus>;
}
