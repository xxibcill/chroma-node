export const SUPPORT_SCHEMA_VERSION = "1.0.0";

export type CrashReportStatus = "pending" | "submitted" | "failed";

export interface CrashReport {
  id: string;
  schemaVersion: typeof SUPPORT_SCHEMA_VERSION;
  createdAt: number;
  appVersion: string;
  osInfo: string;
  crashType: string;
  message: string;
  stackTrace?: string;
  redacted: boolean;
  status: CrashReportStatus;
  projectId?: string;
}

export interface DiagnosticEntry {
  key: string;
  label: string;
  value: string;
  category: "app" | "system" | "ffmpeg" | "media" | "error";
}

export interface SupportBundleManifest {
  schemaVersion: typeof SUPPORT_SCHEMA_VERSION;
  bundleId: string;
  createdAt: number;
  appVersion: string;
  includes: string[];
  redacted: boolean;
  diagnostics: DiagnosticEntry[];
  logs?: string[];
  projectSummary?: string;
  mediaMetadata?: Record<string, unknown>;
  contactInfo?: string;
}

export interface FeedbackSubmission {
  id: string;
  schemaVersion: typeof SUPPORT_SCHEMA_VERSION;
  createdAt: number;
  type: "general" | "bug" | "feature" | "support";
  text: string;
  contactEmail?: string;
  attachScreenshot: boolean;
  attachDiagnostics: boolean;
  attachProjectDiagnostics: boolean;
  projectId?: string;
  appVersion: string;
}

export interface FeedbackSubmissionResult {
  success: boolean;
  id?: string;
  errorMessage?: string;
}

export function createCrashReport(data: {
  crashType: string;
  message: string;
  stackTrace?: string;
  appVersion: string;
  osInfo: string;
  projectId?: string;
}): CrashReport {
  return {
    id: `crash-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    schemaVersion: SUPPORT_SCHEMA_VERSION,
    createdAt: Date.now(),
    appVersion: data.appVersion,
    osInfo: data.osInfo,
    crashType: data.crashType,
    message: data.message,
    stackTrace: data.stackTrace,
    redacted: true,
    status: "pending",
    projectId: data.projectId
  };
}

export function createDiagnosticEntry(
  key: string,
  label: string,
  value: string,
  category: DiagnosticEntry["category"]
): DiagnosticEntry {
  return { key, label, value, category };
}

export function redactSensitivePath(text: string): string {
  return text
    .replace(/\/Users\/[^\/]+\//g, "/Users/REDACTED/")
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "user@REDACTED");
}
