import { describe, expect, it } from "vitest";
import {
  getAspectRatio,
  getDisplaySize,
  isRotated,
  MAX_DISPLAY_HEIGHT,
  MAX_DISPLAY_WIDTH,
  normalizeRotation
} from "./mediaGeometry";

describe("mediaGeometry", () => {
  describe("normalizeRotation", () => {
    it("returns 0 for 0 degrees", () => {
      expect(normalizeRotation(0)).toBe(0);
    });

    it("returns 90 for 90 degrees", () => {
      expect(normalizeRotation(90)).toBe(90);
    });

    it("returns 180 for 180 degrees", () => {
      expect(normalizeRotation(180)).toBe(180);
    });

    it("returns 270 for 270 degrees", () => {
      expect(normalizeRotation(270)).toBe(270);
    });

    it("normalizes 360 to 0", () => {
      expect(normalizeRotation(360)).toBe(0);
    });

    it("normalizes 450 to 90", () => {
      expect(normalizeRotation(450)).toBe(90);
    });

    it("normalizes negative rotations", () => {
      expect(normalizeRotation(-90)).toBe(270);
    });

    it("normalizes -360 to 0", () => {
      const result = normalizeRotation(-360);
      expect(result === 0 || Object.is(result, -0)).toBe(true);
    });
  });

  describe("isRotated", () => {
    it("returns false for 0 degrees", () => {
      expect(isRotated(0)).toBe(false);
    });

    it("returns true for 90 degrees", () => {
      expect(isRotated(90)).toBe(true);
    });

    it("returns false for 180 degrees", () => {
      expect(isRotated(180)).toBe(false);
    });

    it("returns true for 270 degrees", () => {
      expect(isRotated(270)).toBe(true);
    });

    it("normalizes and checks 450 (90 degrees equivalent)", () => {
      expect(isRotated(450)).toBe(true);
    });

    it("normalizes and checks -90 (270 degrees equivalent)", () => {
      expect(isRotated(-90)).toBe(true);
    });
  });

  describe("getDisplaySize", () => {
    it("returns original dimensions for landscape (0 degrees)", () => {
      const result = getDisplaySize(1920, 1080, 0);
      expect(result.displayWidth).toBe(1920);
      expect(result.displayHeight).toBe(1080);
    });

    it("swaps dimensions for portrait (90 degrees)", () => {
      const result = getDisplaySize(1920, 1080, 90);
      expect(result.displayWidth).toBe(1080);
      expect(result.displayHeight).toBe(1920);
    });

    it("returns original dimensions for landscape (180 degrees)", () => {
      const result = getDisplaySize(1920, 1080, 180);
      expect(result.displayWidth).toBe(1920);
      expect(result.displayHeight).toBe(1080);
    });

    it("swaps dimensions for portrait (270 degrees)", () => {
      const result = getDisplaySize(1920, 1080, 270);
      expect(result.displayWidth).toBe(1080);
      expect(result.displayHeight).toBe(1920);
    });

    it("handles square media", () => {
      const result = getDisplaySize(1080, 1080, 90);
      expect(result.displayWidth).toBe(1080);
      expect(result.displayHeight).toBe(1080);
    });

    it("handles portrait source media (1080x1920)", () => {
      const result = getDisplaySize(1080, 1920, 0);
      expect(result.displayWidth).toBe(1080);
      expect(result.displayHeight).toBe(1920);
    });

    it("swaps for rotated portrait source media", () => {
      const result = getDisplaySize(1080, 1920, 90);
      expect(result.displayWidth).toBe(1920);
      expect(result.displayHeight).toBe(1080);
    });
  });

  describe("getAspectRatio", () => {
    it("computes 16:9 landscape aspect ratio", () => {
      expect(getAspectRatio(1920, 1080)).toBeCloseTo(16 / 9, 5);
    });

    it("computes 9:16 portrait aspect ratio", () => {
      expect(getAspectRatio(1080, 1920)).toBeCloseTo(9 / 16, 5);
    });

    it("computes 1:1 square aspect ratio", () => {
      expect(getAspectRatio(1080, 1080)).toBe(1);
    });

    it("returns 0 for zero height", () => {
      expect(getAspectRatio(1920, 0)).toBe(0);
    });
  });

  describe("MAX_DISPLAY_WIDTH", () => {
    it("is 3840", () => {
      expect(MAX_DISPLAY_WIDTH).toBe(3840);
    });
  });

  describe("MAX_DISPLAY_HEIGHT", () => {
    it("is 2160", () => {
      expect(MAX_DISPLAY_HEIGHT).toBe(2160);
    });
  });
});
