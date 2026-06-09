import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  configureTelemetry,
  deleteAllTelemetryData,
  enqueueEvent,
  flushQueue,
  getQueueSize,
  loadQueue,
  setConsent,
  trackEvent
} from "./telemetryStore";
import { createTelemetryEvent } from "../shared/telemetry";

const electronMock = vi.hoisted(() => ({
  userDataPath: ""
}));

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(() => electronMock.userDataPath)
  }
}));

describe("telemetryStore", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "chroma-telemetry-"));
    electronMock.userDataPath = tempDir;
    await configureTelemetry({ enabled: false, endpoint: undefined, exportFilePath: undefined, flushIntervalMs: 60_000, maxQueueSize: 100, maxRetries: 3 });
    await setConsent("granted");
    await deleteAllTelemetryData();
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await configureTelemetry({ enabled: false, endpoint: undefined, exportFilePath: undefined });
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("does not enqueue events while telemetry is disabled even with consent", async () => {
    trackEvent("feature:use", { feature: "export" });
    await waitForAsyncTrack();

    await expect(getQueueSize()).resolves.toBe(0);
  });

  it("queues redacted events when enabled and consent is granted", async () => {
    await configureTelemetry({ enabled: true });

    await enqueueEvent(createTelemetryEvent("export:start", {
      sourcePath: "/Users/jjae/Videos/client.mov",
      note: "Contact maya@example.com"
    }));

    await expect(getQueueSize()).resolves.toBe(1);
    const queue = await loadQueue();
    expect(queue[0].event.payload).toMatchObject({
      sourcePath: "REDACTED",
      note: "Contact user@REDACTED"
    });
  });

  it("flushes events loaded from persisted queue state", async () => {
    await configureTelemetry({ enabled: true });
    await fs.writeFile(path.join(tempDir, "telemetry-queue.json"), JSON.stringify([
      {
        event: createTelemetryEvent("feature:use", { feature: "export" }),
        retryCount: 0,
        enqueuedAt: Date.now()
      }
    ]), "utf8");

    const result = await flushQueue();

    expect(result).toEqual({ sent: 1, failed: 0 });
    await expect(getQueueSize()).resolves.toBe(0);
  });

  it("exports flushed events to a local JSONL sink", async () => {
    const exportPath = path.join(tempDir, "telemetry", "events.jsonl");
    await configureTelemetry({ enabled: true, exportFilePath: exportPath });
    await enqueueEvent(createTelemetryEvent("feature:use", { feature: "review" }));

    const result = await flushQueue();

    expect(result).toEqual({ sent: 1, failed: 0 });
    const lines = (await fs.readFile(exportPath, "utf8")).trim().split("\n");
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toMatchObject({
      type: "feature:use",
      payload: { feature: "review" }
    });
  });

  it("keeps failed endpoint sends queued for retry", async () => {
    await configureTelemetry({ enabled: true, endpoint: "https://telemetry.example.test/events", maxRetries: 3 });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503 })));
    await enqueueEvent(createTelemetryEvent("feature:use", { feature: "export" }));

    const result = await flushQueue();

    expect(result).toEqual({ sent: 0, failed: 1 });
    const queue = await loadQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].retryCount).toBe(1);
  });
});

async function waitForAsyncTrack(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
