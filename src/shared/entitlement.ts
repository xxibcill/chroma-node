export const ENTITLEMENT_SCHEMA_VERSION = "1.0.0";

export type LicenseTier = "free" | "trial" | "paid" | "pro" | "enterprise";
export type LicenseStatus = "active" | "expired" | "deactivated" | "failed";

export interface EntitlementState {
  schemaVersion: typeof ENTITLEMENT_SCHEMA_VERSION;
  tier: LicenseTier;
  status: LicenseStatus;
  activationId?: string;
  activationTimestamp?: number;
  expiresAt?: number;
  offlineGraceExpiresAt?: number;
  lastValidatedAt?: number;
  entitlements: EntitlementFlags;
  purchasedFeatureIds: string[];
  marketplacePurchasedIds: string[];
  usage: EntitlementUsage;
}

export interface EntitlementUsage {
  monthKey: string;
  exportsThisMonth: number;
}

export interface EntitlementFlags {
  proGrading: boolean;
  aiAssistedGrading: boolean;
  exportResolutions: ExportResolutionFlag[];
  maxProjectsPerLibrary: number;
  maxExportsPerMonth: number;
  marketplaceAccess: boolean;
  advancedScopes: boolean;
  prioritySupport: boolean;
}

export type ExportResolutionFlag = "720p" | "1080p" | "4k" | "hdr";

export interface OfflineGrace {
  activatedAt: number;
  expiresAt: number;
  lastKnownTier: LicenseTier;
}

export interface LicenseActivationRequest {
  licenseKey: string;
  machineId: string;
}

export interface LicenseActivationResponse {
  success: boolean;
  activationId?: string;
  tier?: LicenseTier;
  expiresAt?: number;
  errorMessage?: string;
}

export interface LicenseDeactivationRequest {
  activationId: string;
}

export interface LicenseValidationResult {
  valid: boolean;
  state: EntitlementState;
  offlineGraceActive: boolean;
  error?: string;
}

export interface EntitlementCheckRequest {
  feature: keyof EntitlementFlags;
  context?: string;
}

export interface EntitlementCheckResult {
  allowed: boolean;
  currentTier: LicenseTier;
  reason?: string;
}

export const DEFAULT_ENTITLEMENT_FLAGS: EntitlementFlags = {
  proGrading: false,
  aiAssistedGrading: false,
  exportResolutions: ["720p", "1080p"],
  maxProjectsPerLibrary: 5,
  maxExportsPerMonth: 10,
  marketplaceAccess: false,
  advancedScopes: false,
  prioritySupport: false
};

export const TRIAL_ENTITLEMENT_FLAGS: EntitlementFlags = {
  proGrading: true,
  aiAssistedGrading: true,
  exportResolutions: ["720p", "1080p"],
  maxProjectsPerLibrary: 10,
  maxExportsPerMonth: 25,
  marketplaceAccess: false,
  advancedScopes: true,
  prioritySupport: false
};

export const PAID_ENTITLEMENT_FLAGS: EntitlementFlags = {
  proGrading: true,
  aiAssistedGrading: true,
  exportResolutions: ["720p", "1080p", "4k"],
  maxProjectsPerLibrary: 50,
  maxExportsPerMonth: 100,
  marketplaceAccess: true,
  advancedScopes: true,
  prioritySupport: false
};

export const PRO_ENTITLEMENT_FLAGS: EntitlementFlags = {
  proGrading: true,
  aiAssistedGrading: true,
  exportResolutions: ["720p", "1080p", "4k", "hdr"],
  maxProjectsPerLibrary: -1,
  maxExportsPerMonth: -1,
  marketplaceAccess: true,
  advancedScopes: true,
  prioritySupport: true
};

export const OFFLINE_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const TRIAL_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export function createDefaultEntitlementState(): EntitlementState {
  return {
    schemaVersion: ENTITLEMENT_SCHEMA_VERSION,
    tier: "free",
    status: "active",
    entitlements: { ...DEFAULT_ENTITLEMENT_FLAGS },
    purchasedFeatureIds: [],
    marketplacePurchasedIds: [],
    usage: createDefaultUsage()
  };
}

export function createTrialEntitlementState(): EntitlementState {
  const now = Date.now();
  return {
    schemaVersion: ENTITLEMENT_SCHEMA_VERSION,
    tier: "trial",
    status: "active",
    activationTimestamp: now,
    expiresAt: now + TRIAL_DURATION_MS,
    entitlements: { ...TRIAL_ENTITLEMENT_FLAGS },
    purchasedFeatureIds: [],
    marketplacePurchasedIds: [],
    usage: createDefaultUsage()
  };
}

export function isExpired(state: EntitlementState): boolean {
  if (state.status === "expired") return true;
  if (state.status === "deactivated") return true;
  if (state.status === "failed") return true;
  if (state.tier === "trial" && state.expiresAt) {
    return Date.now() > state.expiresAt;
  }
  return false;
}

export function isOfflineGraceActive(state: EntitlementState): boolean {
  if (state.offlineGraceExpiresAt) {
    return Date.now() < state.offlineGraceExpiresAt;
  }
  return false;
}

export function checkEntitlement(
  state: EntitlementState,
  feature: keyof EntitlementFlags
): EntitlementCheckResult {
  if (state.status === "deactivated" || state.status === "failed") {
    return {
      allowed: false,
      currentTier: state.tier,
      reason: state.status === "deactivated"
        ? "License has been deactivated. Please activate a license to continue using this feature."
        : "License validation failed. Please activate or renew your license."
    };
  }

  if (isExpired(state) && !(state.status === "active" && isOfflineGraceActive(state))) {
    return {
      allowed: false,
      currentTier: state.tier,
      reason: `License expired. Please activate your license to continue using this feature.`
    };
  }

  const flags = state.entitlements;
  const value = flags[feature];

  if (typeof value === "boolean") {
    return {
      allowed: value,
      currentTier: state.tier,
      reason: value ? undefined : `Feature ${feature} is not available on your current tier.`
    };
  }

  if (Array.isArray(value) && value.length > 0) {
    return {
      allowed: true,
      currentTier: state.tier
    };
  }

  if (typeof value === "number") {
    return {
      allowed: value !== 0,
      currentTier: state.tier,
      reason: value === 0 ? `Feature ${feature} limit reached.` : undefined
    };
  }

  return {
    allowed: false,
    currentTier: state.tier,
    reason: `Unable to check entitlement for ${feature}.`
  };
}

export function serializeEntitlementState(state: EntitlementState): string {
  return JSON.stringify(state, null, 2);
}

export function deserializeEntitlementState(data: unknown): EntitlementState | null {
  if (typeof data !== "object" || data === null) return null;

  const state = data as EntitlementState;
  if (typeof state.schemaVersion !== "string") return null;
  if (typeof state.tier !== "string") return null;
  if (typeof state.status !== "string") return null;
  if (typeof state.entitlements !== "object") return null;

  return state;
}

export function createDefaultUsage(): EntitlementUsage {
  return {
    monthKey: new Date().toISOString().slice(0, 7),
    exportsThisMonth: 0
  };
}
