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
      return {
        ...(parsed as EntitlementState),
        usage: normalizeUsage((parsed as Partial<EntitlementState>).usage)
      };
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
  const offlineGraceActive = canUseOfflineGrace(state);

  if (state.status === "deactivated") {
    return {
      valid: false,
      state,
      offlineGraceActive: false,
      error: "License has been deactivated. Please activate a license to continue."
    };
  }

  if (state.status === "failed") {
    return {
      valid: false,
      state,
      offlineGraceActive: false,
      error: "License validation failed. Please activate or renew your license."
    };
  }

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
    entitlements: tier === "pro" || tier === "enterprise" ? { ...PRO_ENTITLEMENT_FLAGS } : { ...PAID_ENTITLEMENT_FLAGS },
    purchasedFeatureIds: [],
    marketplacePurchasedIds: [],
    usage: getCurrentUsage()
  };
  await saveEntitlementState(state);
  return state;
}

export async function activateLicenseKey(licenseKey: string): Promise<{
  success: boolean;
  state?: EntitlementState;
  errorMessage?: string;
}> {
  const parsed = parseLicenseKey(licenseKey);
  if (!parsed) {
    return {
      success: false,
      errorMessage: "License key is invalid. Expected CN-PAID-..., CN-PRO-..., CN-ENTERPRISE-..., or CN1.<base64-json>."
    };
  }

  if (parsed.expiresAt !== undefined && parsed.expiresAt < Date.now()) {
    return {
      success: false,
      errorMessage: "License key has expired."
    };
  }

  const state = await activateLicense(parsed.activationId, parsed.tier);
  if (parsed.expiresAt !== undefined) {
    state.expiresAt = parsed.expiresAt;
    await saveEntitlementState(state);
  }

  return { success: true, state };
}

export async function deactivateLicense(): Promise<void> {
  const state = await loadEntitlementState();
  state.status = "deactivated";
  state.offlineGraceExpiresAt = undefined;
  await saveEntitlementState(state);
}

export async function recordValidationTimestamp(): Promise<void> {
  const state = await loadEntitlementState();
  state.lastValidatedAt = Date.now();
  await saveEntitlementState(state);
}

export async function enterOfflineGrace(): Promise<void> {
  const state = await loadEntitlementState();
  if (state.status === "active" && !state.offlineGraceExpiresAt) {
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

export async function assertExportAllowed(width: number, height: number): Promise<void> {
  const validation = await validateLicense();
  if (!validation.valid) {
    throw new Error(validation.error ?? "License is not valid.");
  }

  const state = validation.state;
  state.usage = normalizeUsage(state.usage);

  const maxExports = state.entitlements.maxExportsPerMonth;
  if (maxExports !== -1 && state.usage.exportsThisMonth >= maxExports) {
    throw new Error(`Monthly export limit reached for ${state.tier}.`);
  }

  const requiredResolution = requiredResolutionFlag(width, height);
  if (!state.entitlements.exportResolutions.includes(requiredResolution)) {
    throw new Error(`${requiredResolution.toUpperCase()} export is not available on ${state.tier}.`);
  }
}

export async function recordExportUsage(): Promise<EntitlementState> {
  const state = await loadEntitlementState();
  state.usage = normalizeUsage(state.usage);
  state.usage.exportsThisMonth += 1;
  await saveEntitlementState(state);
  return state;
}

function canUseOfflineGrace(state: EntitlementState): boolean {
  return state.status === "active" && isOfflineGraceActive(state);
}

function parseLicenseKey(licenseKey: string): { activationId: string; tier: LicenseTier; expiresAt?: number } | undefined {
  const trimmed = licenseKey.trim();
  const prefixed = /^(CN)-(PAID|PRO|ENTERPRISE)-([A-Z0-9-]{8,})$/i.exec(trimmed);
  if (prefixed) {
    return {
      activationId: prefixed[3].toUpperCase(),
      tier: prefixed[2].toLowerCase() as LicenseTier
    };
  }

  if (!trimmed.startsWith("CN1.")) {
    return undefined;
  }

  try {
    const decoded = JSON.parse(Buffer.from(trimmed.slice(4), "base64url").toString("utf8")) as Record<string, unknown>;
    const tier = decoded.tier;
    const activationId = decoded.activationId;
    if (!isPaidTier(tier) || typeof activationId !== "string" || !activationId.trim()) {
      return undefined;
    }

    return {
      activationId,
      tier,
      expiresAt: typeof decoded.expiresAt === "number" ? decoded.expiresAt : undefined
    };
  } catch {
    return undefined;
  }
}

function isPaidTier(value: unknown): value is LicenseTier {
  return value === "paid" || value === "pro" || value === "enterprise";
}

function normalizeUsage(usage: Partial<EntitlementState["usage"]> | undefined): EntitlementState["usage"] {
  const current = getCurrentUsage();
  if (!usage || usage.monthKey !== current.monthKey || typeof usage.exportsThisMonth !== "number") {
    return current;
  }
  return {
    monthKey: usage.monthKey,
    exportsThisMonth: Math.max(0, Math.floor(usage.exportsThisMonth))
  };
}

function getCurrentUsage(): EntitlementState["usage"] {
  return {
    monthKey: new Date().toISOString().slice(0, 7),
    exportsThisMonth: 0
  };
}

function requiredResolutionFlag(width: number, height: number): "720p" | "1080p" | "4k" | "hdr" {
  const longEdge = Math.max(width, height);
  if (longEdge > 3840) {
    return "hdr";
  }
  if (longEdge > 1920) {
    return "4k";
  }
  if (longEdge > 1280) {
    return "1080p";
  }
  return "720p";
}
