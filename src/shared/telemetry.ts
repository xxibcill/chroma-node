export const TELEMETRY_SCHEMA_VERSION = "1.0.0";

export type TelemetryConsent = "pending" | "granted" | "declined";

export type TelemetryEventType =
  | "app:start"
  | "app:quit"
  | "license:activate"
  | "license:expire"
  | "license:trial-start"
  | "license:trial-end"
  | "export:start"
  | "export:complete"
  | "export:cancel"
  | "export:fail"
  | "lesson:start"
  | "lesson:complete"
  | "feature:use"
  | "error:occur"
  | "performance:measure";

export interface TelemetryEvent {
  id: string;
  schemaVersion: typeof TELEMETRY_SCHEMA_VERSION;
  type: TelemetryEventType;
  timestamp: number;
  payload: Record<string, unknown>;
}

export interface TelemetryConsentState {
  schemaVersion: string;
  consent: TelemetryConsent;
  updatedAt: number;
}

export interface TelemetryQueueEntry {
  event: TelemetryEvent;
  retryCount: number;
  enqueuedAt: number;
}

export interface TelemetryConfig {
  enabled: boolean;
  endpoint?: string;
  flushIntervalMs: number;
  maxQueueSize: number;
  maxRetries: number;
}

export const DEFAULT_TELEMETRY_CONFIG: TelemetryConfig = {
  enabled: false,
  flushIntervalMs: 60000,
  maxQueueSize: 100,
  maxRetries: 3
};

export const REDACT_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\/\Users\/[^\/]+\//g, replacement: "/Users/REDACTED/" },
  { pattern: /\/\/[\w.-]+\/[\w.-]+\//g, replacement: "//REMOTE/REDACTED/" },
  { pattern: /\w{8,}-\w{4,}-\w{4,}-\w{4,}-\w{12,}/g, replacement: "[UUID]" },
  { pattern: /[\w.-]+@[\w.-]+\.\w+/g, replacement: "user@REDACTED" }
];

export function redactEvent(event: TelemetryEvent): TelemetryEvent {
  const redactedPayload: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(event.payload)) {
    if (key === "sourcePath" || key === "fileName" || key === "projectName" || key === "localPath") {
      redactedPayload[key] = "REDACTED";
    } else if (typeof value === "string") {
      let redacted = value;
      for (const { pattern, replacement } of REDACT_PATTERNS) {
        redacted = redacted.replace(pattern, replacement);
      }
      redactedPayload[key] = redacted;
    } else {
      redactedPayload[key] = value;
    }
  }

  return {
    ...event,
    payload: redactedPayload
  };
}

export function createTelemetryEvent(
  type: TelemetryEventType,
  payload: Record<string, unknown>
): TelemetryEvent {
  return {
    id: `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    schemaVersion: TELEMETRY_SCHEMA_VERSION,
    type,
    timestamp: Date.now(),
    payload
  };
}

export function validateTelemetryEvent(event: unknown): event is TelemetryEvent {
  if (!event || typeof event !== "object") return false;
  const e = event as TelemetryEvent;
  return (
    typeof e.id === "string" &&
    e.schemaVersion === TELEMETRY_SCHEMA_VERSION &&
    typeof e.type === "string" &&
    typeof e.timestamp === "number" &&
    typeof e.payload === "object"
  );
}
