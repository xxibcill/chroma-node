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
    await configureTelemetry({ enabled: false, endpoint: undefined, flushIntervalMs: 60_000, maxQueueSize: 100, maxRetries: 3 });
    await setConsent("granted");
    await deleteAllTelemetryData();
  });

  afterEach(async () => {
    await configureTelemetry({ enabled: false, endpoint: undefined });
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
});

async function waitForAsyncTrack(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
