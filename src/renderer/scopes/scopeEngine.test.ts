import { describe, expect, it } from "vitest";
import {
  buildScopeCacheKey,
  computeNodeGraphHash,
  createBinningGrid,
  createHistogramStats,
  getEffectiveSamplingPolicy,
  getMeasurementSpaceLabel,
  getPlaybackThrottleInterval,
  getScaleRange,
  getScopeCapabilities,
  percentileFromBins
} from "./scopeEngine";
import { createColorNode } from "../../shared/colorEngine";

describe("scope engine", () => {
  describe("measurement space labels", () => {
    it("returns human-readable labels for all measurement spaces", () => {
      expect(getMeasurementSpaceLabel("source")).toBe("Source");
      expect(getMeasurementSpaceLabel("working")).toBe("Working");
      expect(getMeasurementSpaceLabel("display-rendered")).toBe("Display");
      expect(getMeasurementSpaceLabel("output")).toBe("Output");
      expect(getMeasurementSpaceLabel("original-compare")).toBe("Original");
      expect(getMeasurementSpaceLabel("graded-compare")).toBe("Graded");
    });
  });

  describe("scope capabilities", () => {
    it("declares waveform as sdr, hdr, rgb, luma capable with comparison", () => {
      const caps = getScopeCapabilities("waveform");
      expect(caps.sdr).toBe(true);
      expect(caps.hdr).toBe(true);
      expect(caps.rgb).toBe(true);
      expect(caps.luma).toBe(true);
      expect(caps.comparison).toBe(true);
    });

    it("declares vectorscope as chroma-capable without rgb or comparison", () => {
      const caps = getScopeCapabilities("vectorscope");
      expect(caps.chroma).toBe(true);
      expect(caps.rgb).toBe(false);
      expect(caps.comparison).toBe(false);
    });
  });

  describe("node graph hash", () => {
    it("returns neutral for empty node list", () => {
      expect(computeNodeGraphHash([])).toBe("neutral");
    });

    it("produces consistent hash for same nodes", () => {
      const node = createColorNode(1);
      node.primaries.offset = { r: 0.1, g: 0.2, b: 0.3 };
      const hash1 = computeNodeGraphHash([node]);
      const hash2 = computeNodeGraphHash([node]);
      expect(hash1).toBe(hash2);
    });

    it("produces different hash when node content changes", () => {
      const node1 = createColorNode(1);
      const node2 = createColorNode(1);
      node2.primaries.offset = { r: 0.1, g: 0, b: 0 };
      expect(computeNodeGraphHash([node1])).not.toBe(computeNodeGraphHash([node2]));
    });
  });

  describe("cache key building", () => {
    it("includes measurement space in cache key", () => {
      const key = buildScopeCacheKey(0, [], "source", "ire", "full", 640, 256);
      expect(key.measurementSpace).toBe("source");
    });

    it("includes scale in cache key", () => {
      const key = buildScopeCacheKey(0, [], "output", "nit", "full", 640, 256);
      expect(key.scale).toBe("nit");
    });
  });

  describe("effective sampling policy", () => {
    it("returns full when not dynamic", () => {
      expect(getEffectiveSamplingPolicy("full", false, 1920 * 1080)).toBe("full");
      expect(getEffectiveSamplingPolicy("half", false, 1920 * 1080)).toBe("half");
    });

    it("returns half for large frames during playback", () => {
      expect(getEffectiveSamplingPolicy("dynamic", true, 3840 * 2160)).toBe("half");
    });

    it("returns full for normal frames during playback", () => {
      expect(getEffectiveSamplingPolicy("dynamic", true, 1920 * 1080)).toBe("full");
    });
  });

  describe("scale range", () => {
    it("returns IRE divisions", () => {
      const range = getScaleRange("ire");
      expect(range.divisions).toEqual([0, 25, 50, 75, 100]);
    });

    it("returns nit divisions for HDR", () => {
      const range = getScaleRange("nit");
      expect(range.max).toBe(10000);
      expect(range.divisions).toContain(1000);
    });
  });

  describe("playback throttle", () => {
    it("returns 0 when scopes inactive", () => {
      expect(getPlaybackThrottleInterval(false, false)).toBe(0);
    });

    it("returns 15fps interval when playing", () => {
      expect(getPlaybackThrottleInterval(true, true)).toBeCloseTo(1000 / 15, 2);
    });

    it("returns 30fps interval when paused", () => {
      expect(getPlaybackThrottleInterval(false, true)).toBeCloseTo(1000 / 30, 2);
    });
  });

  describe("binning grid", () => {
    it("creates 1:1 mapping by default", () => {
      const grid = createBinningGrid({ scopeWidth: 100, scopeHeight: 100 });
      expect(grid.xScale).toBe(1);
      expect(grid.yScale).toBe(1);
    });

    it("reduces bin count when specified", () => {
      const grid = createBinningGrid({ scopeWidth: 100, scopeHeight: 100, xBinCount: 50, yBinCount: 50 });
      expect(grid.xScale).toBe(2);
      expect(grid.yScale).toBe(2);
    });
  });

  describe("histogram stats", () => {
    it("returns zeroed stats for empty bins", () => {
      const bins = new Float32Array(256);
      const stats = createHistogramStats(bins, 0, 0);
      expect(stats.mean).toBe(0.5);
      expect(stats.clippingCount).toBe(0);
    });

    it("calculates mean from weighted bins", () => {
      const bins = new Float32Array(256);
      bins[128] = 10;
      bins[200] = 5;
      const stats = createHistogramStats(bins, 10, 15);
      expect(stats.mean).toBeGreaterThan(0);
    });
  });

  describe("percentile from bins", () => {
    it("returns 0 for empty bins", () => {
      const bins = new Float32Array(256);
      expect(percentileFromBins(bins, 0.5)).toBe(0);
    });

    it("returns median-ish position for evenly distributed values", () => {
      const bins = new Float32Array(100);
      for (let i = 0; i < 100; i += 1) {
        bins[i] = 1;
      }
      const result = percentileFromBins(bins, 0.5);
      expect(result).toBeGreaterThan(0.3);
      expect(result).toBeLessThan(0.7);
    });
  });
});
