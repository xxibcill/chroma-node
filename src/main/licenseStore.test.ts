import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTrialEntitlementState } from "../shared/entitlement";
import {
  activateLicense,
  assertExportAllowed,
  deactivateLicense,
  saveEntitlementState,
  validateLicense
} from "./licenseStore";

const electronMock = vi.hoisted(() => ({
  userDataPath: ""
}));

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(() => electronMock.userDataPath)
  }
}));

describe("licenseStore", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "chroma-license-"));
    electronMock.userDataPath = tempDir;
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("blocks export when a trial has expired", async () => {
    await saveEntitlementState({
      ...createTrialEntitlementState(),
      expiresAt: Date.now() - 1_000
    });

    await expect(assertExportAllowed(1280, 720)).rejects.toThrow(/expired/i);
  });

  it("does not grant offline grace after explicit deactivation", async () => {
    await activateLicense("activation-1", "pro");
    await deactivateLicense();

    await expect(validateLicense()).resolves.toMatchObject({
      valid: false,
      offlineGraceActive: false
    });
    await expect(assertExportAllowed(1920, 1080)).rejects.toThrow(/deactivated/i);
  });
});
