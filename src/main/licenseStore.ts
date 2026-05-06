import { app } from "electron";
import { existsSync } from "fs";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import {
  type EntitlementState,
  type LicenseTier,
  type LicenseValidationResult,
  type EntitlementCheckResult,
  createDefaultEntitlementState,
  createTrialEntitlementState,
  checkEntitlement,
  isExpired,
  isOfflineGraceActive,
  OFFLINE_GRACE_PERIOD_MS,
  DEFAULT_ENTITLEMENT_FLAGS,
  PAID_ENTITLEMENT_FLAGS,
  PRO_ENTITLEMENT_FLAGS
} from "../shared/entitlement.js";

const LICENSE_FILE = "entitlement.json";

function getLicensePath(): string {
  return path.join(app.getPath("userData"), LICENSE_FILE);
}

async function ensureUserDataDir(): Promise<void> {
  const dir = app.getPath("userData");
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

export async function loadEntitlementState(): Promise<EntitlementState> {
  const licensePath = getLicensePath();
  if (!existsSync(licensePath)) {
    return createDefaultEntitlementState();
  }

  try {
    const data = await readFile(licensePath, "utf8");
    const parsed = JSON.parse(data);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.schemaVersion === "string" &&
      typeof parsed.tier === "string"
    ) {
      return parsed as EntitlementState;
    }
  } catch {
    // corrupted file, reset to default
  }

  return createDefaultEntitlementState();
}

export async function saveEntitlementState(state: EntitlementState): Promise<void> {
  await ensureUserDataDir();
  const licensePath = getLicensePath();
  await writeFile(licensePath, JSON.stringify(state, null, 2), "utf8");
}

export async function validateLicense(): Promise<LicenseValidationResult> {
  const state = await loadEntitlementState();
  const offlineGraceActive = isOfflineGraceActive(state);

  if (!isExpired(state) || offlineGraceActive) {
    return { valid: true, state, offlineGraceActive };
  }

  return {
    valid: false,
    state,
    offlineGraceActive: false,
    error: "License has expired. Please activate or renew your license."
  };
}

export async function checkFeatureEntitlement(
  feature: keyof typeof DEFAULT_ENTITLEMENT_FLAGS
): Promise<EntitlementCheckResult> {
  const state = await loadEntitlementState();
  return checkEntitlement(state, feature);
}

export async function startTrial(): Promise<EntitlementState> {
  const state = createTrialEntitlementState();
  await saveEntitlementState(state);
  return state;
}

export async function activateLicense(
  activationId: string,
  tier: LicenseTier
): Promise<EntitlementState> {
  const state: EntitlementState = {
    schemaVersion: "1.0.0",
    tier,
    status: "active",
    activationId,
    activationTimestamp: Date.now(),
    entitlements: tier === "pro" ? { ...PRO_ENTITLEMENT_FLAGS } : { ...PAID_ENTITLEMENT_FLAGS },
    purchasedFeatureIds: [],
    marketplacePurchasedIds: []
  };
  await saveEntitlementState(state);
  return state;
}

export async function deactivateLicense(): Promise<void> {
  const state = await loadEntitlementState();
  state.status = "deactivated";
  state.offlineGraceExpiresAt = Date.now() + OFFLINE_GRACE_PERIOD_MS;
  await saveEntitlementState(state);
}

export async function recordValidationTimestamp(): Promise<void> {
  const state = await loadEntitlementState();
  state.lastValidatedAt = Date.now();
  await saveEntitlementState(state);
}

export async function enterOfflineGrace(): Promise<void> {
  const state = await loadEntitlementState();
  if (!state.offlineGraceExpiresAt) {
    state.offlineGraceExpiresAt = Date.now() + OFFLINE_GRACE_PERIOD_MS;
    await saveEntitlementState(state);
  }
}

export async function clearLicense(): Promise<void> {
  const defaultState = createDefaultEntitlementState();
  await saveEntitlementState(defaultState);
}

export async function getEntitlementState(): Promise<EntitlementState> {
  return loadEntitlementState();
}
