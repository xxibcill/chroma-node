import { describe, it, expect } from "vitest";
import {
  createDefaultEntitlementState,
  createTrialEntitlementState,
  isExpired,
  isOfflineGraceActive,
  checkEntitlement,
  ENTITLEMENT_SCHEMA_VERSION,
  DEFAULT_ENTITLEMENT_FLAGS,
  TRIAL_ENTITLEMENT_FLAGS,
  OFFLINE_GRACE_PERIOD_MS,
  TRIAL_DURATION_MS,
  type EntitlementState
} from "./entitlement.js";

describe("entitlement module", () => {
  describe("createDefaultEntitlementState", () => {
    it("creates a free tier state", () => {
      const state = createDefaultEntitlementState();
      expect(state.schemaVersion).toBe(ENTITLEMENT_SCHEMA_VERSION);
      expect(state.tier).toBe("free");
      expect(state.status).toBe("active");
      expect(state.entitlements).toEqual(DEFAULT_ENTITLEMENT_FLAGS);
    });
  });

  describe("createTrialEntitlementState", () => {
    it("creates a trial state with correct expiry", () => {
      const before = Date.now();
      const state = createTrialEntitlementState();
      const after = Date.now();

      expect(state.tier).toBe("trial");
      expect(state.status).toBe("active");
      expect(state.expiresAt).toBeGreaterThanOrEqual(before + TRIAL_DURATION_MS);
      expect(state.expiresAt).toBeLessThanOrEqual(after + TRIAL_DURATION_MS);
      expect(state.entitlements).toEqual(TRIAL_ENTITLEMENT_FLAGS);
    });
  });

  describe("isExpired", () => {
    it("returns false for active free state", () => {
      const state = createDefaultEntitlementState();
      expect(isExpired(state)).toBe(false);
    });

    it("returns true for expired trial", () => {
      const state: EntitlementState = {
        ...createTrialEntitlementState(),
        expiresAt: Date.now() - 1000
      };
      expect(isExpired(state)).toBe(true);
    });

    it("returns true for deactivated state", () => {
      const state: EntitlementState = {
        ...createDefaultEntitlementState(),
        status: "deactivated"
      };
      expect(isExpired(state)).toBe(true);
    });

    it("returns true for failed state", () => {
      const state: EntitlementState = {
        ...createDefaultEntitlementState(),
        status: "failed"
      };
      expect(isExpired(state)).toBe(true);
    });
  });

  describe("isOfflineGraceActive", () => {
    it("returns false when no grace period is set", () => {
      const state = createDefaultEntitlementState();
      expect(isOfflineGraceActive(state)).toBe(false);
    });

    it("returns true when grace period is still valid", () => {
      const state: EntitlementState = {
        ...createDefaultEntitlementState(),
        offlineGraceExpiresAt: Date.now() + OFFLINE_GRACE_PERIOD_MS
      };
      expect(isOfflineGraceActive(state)).toBe(true);
    });

    it("returns false when grace period has expired", () => {
      const state: EntitlementState = {
        ...createDefaultEntitlementState(),
        offlineGraceExpiresAt: Date.now() - 1000
      };
      expect(isOfflineGraceActive(state)).toBe(false);
    });
  });

  describe("checkEntitlement", () => {
    it("allows proGrading for trial users", () => {
      const state = createTrialEntitlementState();
      const result = checkEntitlement(state, "proGrading");
      expect(result.allowed).toBe(true);
      expect(result.currentTier).toBe("trial");
    });

    it("denies aiAssistedGrading for free users", () => {
      const state = createDefaultEntitlementState();
      const result = checkEntitlement(state, "aiAssistedGrading");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("not available on your current tier");
    });

    it("denies expired license without grace", () => {
      const state: EntitlementState = {
        ...createTrialEntitlementState(),
        expiresAt: Date.now() - 1000,
        offlineGraceExpiresAt: undefined
      };
      const result = checkEntitlement(state, "proGrading");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("expired");
    });

    it("allows features during offline grace", () => {
      const state: EntitlementState = {
        ...createTrialEntitlementState(),
        expiresAt: Date.now() - 1000,
        offlineGraceExpiresAt: Date.now() + OFFLINE_GRACE_PERIOD_MS
      };
      const result = checkEntitlement(state, "proGrading");
      expect(result.allowed).toBe(true);
    });
  });
});
