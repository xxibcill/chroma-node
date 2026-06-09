import { app } from "electron";
import { existsSync } from "fs";
import { appendFile, readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import {
  type TelemetryConsent,
  type TelemetryConfig,
  type TelemetryEvent,
  type TelemetryQueueEntry,
  type TelemetryConsentState,
  DEFAULT_TELEMETRY_CONFIG,
  createTelemetryEvent,
  redactEvent,
  validateTelemetryEvent,
  TELEMETRY_SCHEMA_VERSION
} from "../shared/telemetry.js";

const CONSENT_FILE = "telemetry-consent.json";
const QUEUE_FILE = "telemetry-queue.json";

function getUserDataPath(): string {
  return app.getPath("userData");
}

async function ensureDir(): Promise<void> {
  const dir = getUserDataPath();
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

function getConsentPath(): string {
  return path.join(getUserDataPath(), CONSENT_FILE);
}

function getQueuePath(): string {
  return path.join(getUserDataPath(), QUEUE_FILE);
}

let consentState: TelemetryConsentState = {
  schemaVersion: "1.0.0",
  consent: "pending",
  updatedAt: Date.now()
};

let eventQueue: TelemetryQueueEntry[] = [];
let config: TelemetryConfig = { ...DEFAULT_TELEMETRY_CONFIG };
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export async function loadConsent(): Promise<TelemetryConsentState> {
  const consentPath = getConsentPath();
  if (!existsSync(consentPath)) {
    return consentState;
  }

  try {
    const data = await readFile(consentPath, "utf8");
    const parsed = JSON.parse(data);
    if (parsed && typeof parsed.consent === "string") {
      consentState = {
        schemaVersion: parsed.schemaVersion || "1.0.0",
        consent: parsed.consent,
        updatedAt: parsed.updatedAt || Date.now()
      };
    }
  } catch {
    // corrupted, use default
  }

  return consentState;
}

export async function saveConsent(state: TelemetryConsentState): Promise<void> {
  await ensureDir();
  const consentPath = getConsentPath();
  await writeFile(consentPath, JSON.stringify(state, null, 2), "utf8");
  consentState = state;
}

export async function setConsent(consent: TelemetryConsent): Promise<TelemetryConsentState> {
  const newState: TelemetryConsentState = {
    schemaVersion: TELEMETRY_SCHEMA_VERSION,
    consent,
    updatedAt: Date.now()
  };
  await saveConsent(newState);

  if (consent === "granted" && config.enabled) {
    startFlushTimer();
  } else {
    stopFlushTimer();
  }

  return newState;
}

export async function loadQueue(): Promise<TelemetryQueueEntry[]> {
  const queuePath = getQueuePath();
  if (!existsSync(queuePath)) {
    return [];
  }

  try {
    const data = await readFile(queuePath, "utf8");
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      eventQueue = parsed.filter(
        (entry): entry is TelemetryQueueEntry =>
          entry &&
          validateTelemetryEvent(entry.event) &&
          typeof entry.retryCount === "number" &&
          typeof entry.enqueuedAt === "number"
      );
    }
  } catch {
    eventQueue = [];
  }

  return eventQueue;
}

async function saveQueue(): Promise<void> {
  await ensureDir();
  const queuePath = getQueuePath();
  await writeFile(queuePath, JSON.stringify(eventQueue, null, 2), "utf8");
}

export async function enqueueEvent(event: TelemetryEvent): Promise<void> {
  if (!config.enabled) {
    return;
  }

  const consent = await loadConsent();
  if (consent.consent !== "granted") {
    return;
  }

  const redacted = redactEvent(event);
  const entry: TelemetryQueueEntry = {
    event: redacted,
    retryCount: 0,
    enqueuedAt: Date.now()
  };

  eventQueue.push(entry);

  if (eventQueue.length > config.maxQueueSize) {
    eventQueue = eventQueue.slice(-config.maxQueueSize);
  }

  await saveQueue();
}

export async function flushQueue(): Promise<{ sent: number; failed: number }> {
  if (!config.enabled) {
    return { sent: 0, failed: 0 };
  }

  const consent = await loadConsent();
  if (consent.consent !== "granted") {
    return { sent: 0, failed: 0 };
  }

  await loadQueue();

  if (eventQueue.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  const remaining: TelemetryQueueEntry[] = [];

  for (const entry of eventQueue) {
    try {
      await sendTelemetryEvent(entry.event);
      sent++;
    } catch {
      failed++;
      if (entry.retryCount < config.maxRetries) {
        entry.retryCount++;
        remaining.push(entry);
      }
    }
  }

  eventQueue = remaining;
  await saveQueue();

  return { sent, failed };
}

async function sendTelemetryEvent(event: TelemetryEvent): Promise<void> {
  if (config.endpoint) {
    await sendToEndpoint(event);
  }

  if (config.exportFilePath) {
    await writeToExportFile(event, config.exportFilePath);
  }
}

async function sendToEndpoint(event: TelemetryEvent): Promise<void> {
  if (!config.endpoint) return;

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    throw new Error(`Telemetry endpoint returned ${response.status}`);
  }
}

async function writeToExportFile(event: TelemetryEvent, exportFilePath: string): Promise<void> {
  const resolvedPath = path.resolve(exportFilePath);
  await mkdir(path.dirname(resolvedPath), { recursive: true });
  await appendFile(resolvedPath, `${JSON.stringify(event)}\n`, "utf8");
}

function startFlushTimer(): void {
  stopFlushTimer();
  flushTimer = setInterval(async () => {
    await flushQueue();
  }, config.flushIntervalMs);
}

function stopFlushTimer(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

export async function deleteAllTelemetryData(): Promise<void> {
  stopFlushTimer();
  eventQueue = [];
  const queuePath = getQueuePath();
  if (existsSync(queuePath)) {
    await writeFile(queuePath, JSON.stringify([]), "utf8");
  }
}

export function trackEvent(type: TelemetryEvent["type"], payload: Record<string, unknown>): void {
  const event = createTelemetryEvent(type, payload);
  enqueueEvent(event).catch(() => {});
}

export async function getConsent(): Promise<TelemetryConsentState> {
  return loadConsent();
}

export async function configureTelemetry(newConfig: Partial<TelemetryConfig>): Promise<void> {
  config = { ...config, ...newConfig };
  const consent = await loadConsent();
  if (config.enabled && consent.consent === "granted") {
    startFlushTimer();
  } else {
    stopFlushTimer();
  }
}

export function getConfig(): TelemetryConfig {
  return { ...config };
}

export async function getQueueSize(): Promise<number> {
  const queue = await loadQueue();
  return queue.length;
}
