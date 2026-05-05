import { describe, expect, it } from "vitest";
import {
  createLayoutConfig,
  createSnapshot,
  computeEffectivePolicy,
  freezeCurrentFrame,
  LAYOUT_PRESETS,
  validateLayoutStability,
  validatePerformancePolicy,
  DEFAULT_PERFORMANCE_POLICY
} from "./scopeLayouts";

describe("scope layouts", () => {
  describe("layout presets", () => {
    it("contains all required preset types", () => {
      expect(LAYOUT_PRESETS["compact-two-up"]).toBeDefined();
      expect(LAYOUT_PRESETS["four-up"]).toBeDefined();
      expect(LAYOUT_PRESETS["full-height"]).toBeDefined();
      expect(LAYOUT_PRESETS["focused-single"]).toBeDefined();
      expect(LAYOUT_PRESETS["floating-drawer"]).toBeDefined();
      expect(LAYOUT_PRESETS["compare-layout"]).toBeDefined();
    });

    it("creates layout config from preset", () => {
      const config = createLayoutConfig("compact-two-up");
      expect(config.preset).toBe("compact-two-up");
      expect(config.primaryScope).toBeDefined();
      expect(config.frozenFrame).toBeNull();
    });
  });

  describe("frozen frame", () => {
    it("captures frozen frame with metadata", () => {
      const frozen = freezeCurrentFrame(
        42,
        "working",
        "Rec.709",
        "ire",
        new Float32Array(100),
        new Float32Array(100),
        { red: new Float32Array(100), green: new Float32Array(100), blue: new Float32Array(100) }
      );

      expect(frozen.frameIndex).toBe(42);
      expect(frozen.measurementSpace).toBe("working");
      expect(frozen.timestamp).toBeGreaterThan(0);
    });
  });

  describe("snapshot creation", () => {
    it("captures scope snapshot with all data types", () => {
      const snapshot = createSnapshot(
        "snap-1",
        "Frame 42 Waveform",
        42,
        "working",
        "Rec.709",
        "ire",
        {
          waveform: { bins: new Float32Array(100), peak: 50 }
        }
      );

      expect(snapshot.id).toBe("snap-1");
      expect(snapshot.name).toBe("Frame 42 Waveform");
      expect(snapshot.frameIndex).toBe(42);
      expect(snapshot.data.waveform).toBeDefined();
    });
  });

  describe("layout validation", () => {
    it("validates stable layout dimensions", () => {
      const stableConfig = createLayoutConfig("compact-two-up");
      expect(validateLayoutStability(stableConfig)).toBe(true);
    });
  });

  describe("performance policy", () => {
    it("has sensible defaults", () => {
      expect(DEFAULT_PERFORMANCE_POLICY.maxScopesDuringPlayback).toBeGreaterThan(0);
      expect(DEFAULT_PERFORMANCE_POLICY.samplingPolicy).toBe("dynamic");
    });

    it("validates performance policy bounds", () => {
      const validPolicy = { ...DEFAULT_PERFORMANCE_POLICY, maxScopesDuringPlayback: 4 };
      expect(validatePerformancePolicy(validPolicy)).toBe(true);

      const invalidPolicy = { ...DEFAULT_PERFORMANCE_POLICY, maxScopesDuringPlayback: 0 };
      expect(validatePerformancePolicy(invalidPolicy)).toBe(false);
    });

    it("throttles during playback when scope count exceeds limit", () => {
      const policy = { ...DEFAULT_PERFORMANCE_POLICY, maxScopesDuringPlayback: 2 };
      const throttled = computeEffectivePolicy(policy, true, 4);
      expect(throttled.samplingPolicy).toBe("half");
    });

    it("does not throttle when paused", () => {
      const policy = { ...DEFAULT_PERFORMANCE_POLICY, maxScopesDuringPlayback: 2 };
      const unthrottled = computeEffectivePolicy(policy, false, 4);
      expect(unthrottled.samplingPolicy).toBe("dynamic");
    });
  });
});
