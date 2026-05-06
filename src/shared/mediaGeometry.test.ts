import { describe, expect, it } from "vitest";
import {
  clampDisplaySize,
  getAspectRatio,
  getContainedRect,
  getDisplaySize,
  getOverlayMapping,
  getPaddedContentRect,
  isRotated,
  mapPointToSource,
  MAX_DISPLAY_HEIGHT,
  MAX_SUPPORTED_DISPLAY_EDGE,
  MAX_SUPPORTED_DISPLAY_PIXELS,
  MAX_DISPLAY_WIDTH,
  isSupportedDisplayRaster,
  normalizeRotation,
  applyResizePolicy,
  calcFitDimensions,
  calcCropDimensions,
  calcPadDimensions
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
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
    });

    it("swaps dimensions for portrait (90 degrees)", () => {
      const result = getDisplaySize(1920, 1080, 90);
      expect(result.width).toBe(1080);
      expect(result.height).toBe(1920);
    });

    it("returns original dimensions for landscape (180 degrees)", () => {
      const result = getDisplaySize(1920, 1080, 180);
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
    });

    it("swaps dimensions for portrait (270 degrees)", () => {
      const result = getDisplaySize(1920, 1080, 270);
      expect(result.width).toBe(1080);
      expect(result.height).toBe(1920);
    });

    it("handles square media", () => {
      const result = getDisplaySize(1080, 1080, 90);
      expect(result.width).toBe(1080);
      expect(result.height).toBe(1080);
    });

    it("handles portrait source media (1080x1920)", () => {
      const result = getDisplaySize(1080, 1920, 0);
      expect(result.width).toBe(1080);
      expect(result.height).toBe(1920);
    });

    it("swaps for rotated portrait source media", () => {
      const result = getDisplaySize(1080, 1920, 90);
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
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

  describe("isSupportedDisplayRaster", () => {
    it("allows landscape 4K media", () => {
      expect(isSupportedDisplayRaster(3840, 2160)).toBe(true);
    });

    it("allows portrait 4K-equivalent media", () => {
      expect(isSupportedDisplayRaster(2160, 3840)).toBe(true);
    });

    it("rejects media that exceeds the max edge", () => {
      expect(isSupportedDisplayRaster(2161, 3841)).toBe(false);
    });

    it("rejects media that exceeds the max pixel budget", () => {
      expect(isSupportedDisplayRaster(3000, 3000)).toBe(false);
    });
  });

  describe("clampDisplaySize", () => {
    it("preserves portrait 4K-equivalent media", () => {
      expect(clampDisplaySize(2160, 3840)).toEqual({ width: 2160, height: 3840 });
    });

    it("scales oversized media into the supported raster envelope", () => {
      expect(clampDisplaySize(7680, 4320)).toEqual({ width: 3840, height: 2160 });
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

  describe("MAX_SUPPORTED_DISPLAY_EDGE", () => {
    it("is 3840", () => {
      expect(MAX_SUPPORTED_DISPLAY_EDGE).toBe(3840);
    });
  });

  describe("MAX_SUPPORTED_DISPLAY_PIXELS", () => {
    it("matches a 3840 x 2160 raster", () => {
      expect(MAX_SUPPORTED_DISPLAY_PIXELS).toBe(3840 * 2160);
    });
  });

  // -----------------------------------------------------------------
  // getContainedRect
  // -----------------------------------------------------------------
  describe("getContainedRect", () => {
    it("returns zero rect for degenerate container", () => {
      expect(getContainedRect(0, 0, 1920, 1080)).toEqual({ left: 0, top: 0, width: 0, height: 0 });
      expect(getContainedRect(-1, 100, 1920, 1080)).toEqual({ left: 0, top: 0, width: 0, height: 0 });
    });

    it("returns zero rect for degenerate source", () => {
      expect(getContainedRect(800, 600, 0, 0)).toEqual({ left: 0, top: 0, width: 0, height: 0 });
      expect(getContainedRect(800, 600, -1, 1080)).toEqual({ left: 0, top: 0, width: 0, height: 0 });
    });

    it("letterboxes a 16:9 source in a wider 4:3 container", () => {
      // Container 800x600 (4:3), source 1920x1080 (16:9)
      // containerAspect=1.333 > sourceAspect=1.778? NO — source is wider
      // So we fill width (800), compute height = 800 / (16/9) = 450
      const result = getContainedRect(800, 600, 1920, 1080);
      expect(result.height).toBeCloseTo(450, 0);
      expect(result.width).toBeCloseTo(800, 0);
      expect(result.left).toBe(0);
      expect(result.top).toBeCloseTo((600 - 450) / 2, 0);
    });

    it("pillarboxes a 4:3 source in a narrower 16:9 container", () => {
      // Container 1920x1080 (16:9), source 1440x1080 (4:3)
      // containerAspect=1.778 > sourceAspect=1.333 YES — source is narrower
      // So we fill height (1080), compute width = 1080 * (4/3) = 1440
      const result = getContainedRect(1920, 1080, 1440, 1080);
      expect(result.width).toBeCloseTo(1440, 0);
      expect(result.left).toBeCloseTo((1920 - 1440) / 2, 0);
      expect(result.top).toBe(0);
      expect(result.height).toBeCloseTo(1080, 0);
    });

    it("fills exactly when aspect ratios match", () => {
      const result = getContainedRect(1920, 1080, 1920, 1080);
      expect(result).toEqual({ left: 0, top: 0, width: 1920, height: 1080 });
    });

    it("handles portrait source in portrait container", () => {
      const result = getContainedRect(1080, 1920, 1080, 1920);
      expect(result).toEqual({ left: 0, top: 0, width: 1080, height: 1920 });
    });

    it("handles portrait source in landscape container", () => {
      const result = getContainedRect(1920, 1080, 1080, 1920);
      // Source aspect = 1080/1920 = 0.5625, container aspect = 1920/1080 ≈ 1.778
      // Container is wider, so height fills (1080), width is smaller
      expect(result.height).toBe(1080);
      expect(result.top).toBe(0);
    });

    it("handles square source in landscape container", () => {
      const result = getContainedRect(1920, 1080, 1080, 1080);
      // Square source centered horizontally in landscape container
      expect(result.top).toBe(0);
      expect(result.height).toBe(1080);
      expect(result.left).toBeCloseTo((1920 - 1080) / 2, 5);
      expect(result.width).toBe(1080);
    });
  });

  // -----------------------------------------------------------------
  // applyResizePolicy
  // -----------------------------------------------------------------
  describe("applyResizePolicy", () => {
    it("returns target dims unchanged for crop", () => {
      expect(applyResizePolicy("crop", 1920, 1080, 1440, 1080)).toEqual({ width: 1920, height: 1080 });
      expect(applyResizePolicy("crop", 1920, 1080, 1920, 1080)).toEqual({ width: 1920, height: 1080 });
    });

    it("returns target dims unchanged for pad", () => {
      expect(applyResizePolicy("pad", 1920, 1080, 1440, 1080)).toEqual({ width: 1920, height: 1080 });
    });

    describe("fit policy", () => {
      it("fits wide source into taller target", () => {
        // Target 1080x1920 (portrait), source 1920x1080 (landscape)
        // sourceAspect=1.778 > targetAspect=0.562 → fills width (1080), compute height
        const result = applyResizePolicy("fit", 1080, 1920, 1920, 1080);
        expect(result.width).toBeCloseTo(1080, 0);
        expect(result.height).toBeCloseTo(608, 0);
      });

      it("fits tall source into wider target", () => {
        // Source 1080x1920 (portrait) into 1920x1080 (landscape)
        // sourceAspect=0.562 < targetAspect=1.778 → fills height, width computed
        const result = applyResizePolicy("fit", 1920, 1080, 1080, 1920);
        expect(result.width).toBeCloseTo(608, 0);
        expect(result.height).toBe(1080);
      });

      it("returns target dims when aspect ratios match", () => {
        const result = applyResizePolicy("fit", 1920, 1080, 1920, 1080);
        expect(result).toEqual({ width: 1920, height: 1080 });
      });
    });
  });

  // -----------------------------------------------------------------
  // getPaddedContentRect
  // -----------------------------------------------------------------
  describe("getPaddedContentRect", () => {
    it("centers a 16:9 source in a 4:3 target", () => {
      // Source 1920x1080 (16:9), target 1440x1080 (4:3)
      // scale = min(1440/1920, 1080/1080) = 0.75
      const result = getPaddedContentRect(1920, 1080, 1440, 1080);
      expect(result.height).toBe(810); // 1080 * 0.75
      expect(result.width).toBe(1440); // 1920 * 0.75
      expect(result.left).toBe(0);
      expect(result.top).toBeCloseTo((1080 - 810) / 2, 5);
    });

    it("centers a 4:3 source in a 16:9 target", () => {
      const result = getPaddedContentRect(1440, 1080, 1920, 1080);
      expect(result.width).toBe(1440);
      expect(result.height).toBe(1080);
      expect(result.left).toBeCloseTo((1920 - 1440) / 2, 5);
      expect(result.top).toBe(0);
    });

    it("handles source matching target exactly", () => {
      const result = getPaddedContentRect(1920, 1080, 1920, 1080);
      expect(result).toEqual({ left: 0, top: 0, width: 1920, height: 1080 });
    });

    it("handles square source in rectangular target", () => {
      const result = getPaddedContentRect(1080, 1080, 1920, 1080);
      expect(result.top).toBe(0);
      expect(result.height).toBe(1080);
      expect(result.left).toBeCloseTo((1920 - 1080) / 2, 5);
      expect(result.width).toBe(1080);
    });
  });

  // -----------------------------------------------------------------
  // mapPointToSource
  // -----------------------------------------------------------------
  describe("mapPointToSource", () => {
    it("maps top-left corner to source top-left", () => {
      const rect = { left: 0, top: 0, width: 1920, height: 1080 };
      const result = mapPointToSource({ x: 0, y: 0 }, rect, 1920, 1080);
      expect(result.x).toBeCloseTo(0, 5);
      expect(result.y).toBeCloseTo(0, 5);
    });

    it("maps bottom-right corner to source bottom-right", () => {
      const rect = { left: 0, top: 0, width: 1920, height: 1080 };
      const result = mapPointToSource({ x: 1, y: 1 }, rect, 1920, 1080);
      expect(result.x).toBeCloseTo(1, 5);
      expect(result.y).toBeCloseTo(1, 5);
    });

    it("maps center point correctly with contained rect offset", () => {
      // Letterbox case: rect is centered in container
      const rect = { left: 100, top: 0, width: 1600, height: 900 };
      const result = mapPointToSource({ x: 0.5, y: 0.5 }, rect, 1920, 1080);
      expect(result.x).toBeCloseTo((100 + 0.5 * 1600) / 1920, 5);
      expect(result.y).toBeCloseTo((0 + 0.5 * 900) / 1080, 5);
    });

    it("clamps out-of-range points", () => {
      const rect = { left: 0, top: 0, width: 1920, height: 1080 };
      const result = mapPointToSource({ x: 1.5, y: -0.5 }, rect, 1920, 1080);
      expect(result.x).toBeCloseTo(1, 5);
      expect(result.y).toBeCloseTo(0, 5);
    });
  });

  // -----------------------------------------------------------------
  // getOverlayMapping
  // -----------------------------------------------------------------
  describe("getOverlayMapping", () => {
    it("returns crop mapping for crop policy", () => {
      const result = getOverlayMapping(1920, 1080, 1920, 1080, "crop");
      expect(result).toEqual({
        sourceX: 0,
        sourceY: 0,
        sourceWidth: 1920,
        sourceHeight: 1080,
        targetWidth: 1920,
        targetHeight: 1080
      });
    });

    it("returns pad mapping for pad policy", () => {
      const result = getOverlayMapping(1920, 1080, 1440, 1080, "pad");
      expect(result.sourceWidth).toBe(1920);
      expect(result.sourceHeight).toBe(1080);
      // For source 16:9 into target 4:3: scale = min(1440/1920, 1080/1080) = 0.75
      // Scaled content: 1920*0.75 = 1440, 1080*0.75 = 810
      expect(result.targetWidth).toBe(1440);
      expect(result.targetHeight).toBe(810);
    });

    describe("fit policy", () => {
      it("fits wide source into narrow target", () => {
        // Source 1920x1080 (16:9) into 1080x1920 (portrait 9:16)
        // containerAspect (0.5625) < sourceAspect (1.778) → fills width, computes height
        const result = getOverlayMapping(1920, 1080, 1080, 1920, "fit");
        expect(result.targetWidth).toBe(1080); // fills width
        expect(result.targetHeight).toBeCloseTo(608, 0); // round(1080 / 1.778)
        expect(result.sourceX).toBe(0);
        expect(result.sourceY).toBe(0);
      });

      it("fits tall source into wide target", () => {
        // Source 1080x1920 (portrait) into 1920x1080 (landscape)
        // containerAspect (1.778) > sourceAspect (0.5625) → fills height, computes width
        const result = getOverlayMapping(1080, 1920, 1920, 1080, "fit");
        expect(result.targetHeight).toBe(1080); // fills height
        expect(result.targetWidth).toBeCloseTo(608, 0); // round(1080 * 0.5625)
      });

      it("handles square source in rectangular target", () => {
        const result = getOverlayMapping(1080, 1080, 1920, 1080, "fit");
        expect(result.targetWidth).toBe(1080);
        expect(result.targetHeight).toBe(1080);
        expect(result.sourceX).toBe(0);
        expect(result.sourceY).toBe(0);
      });
    });
  });

  // -----------------------------------------------------------------
  // calcFitDimensions / calcCropDimensions / calcPadDimensions
  // -----------------------------------------------------------------
  describe("calcFitDimensions", () => {
    it("computes fit dims for landscape source into landscape target", () => {
      const result = calcFitDimensions(1920, 1080, 1280, 720);
      expect(result.width).toBe(1280);
      expect(result.height).toBe(720);
    });

    it("computes fit dims for portrait source into landscape target", () => {
      // Portrait 1080x1920 into 1920x1080 landscape
      // containerAspect (1.778) > sourceAspect (0.5625) → fills height, computes width
      const result = calcFitDimensions(1080, 1920, 1920, 1080);
      expect(result.height).toBe(1080); // fills height
      expect(result.width).toBeCloseTo(608, 0); // round(1080 * 0.5625)
    });
  });

  describe("calcCropDimensions", () => {
    it("returns target dimensions directly", () => {
      expect(calcCropDimensions(1920, 1080)).toEqual({ width: 1920, height: 1080 });
      expect(calcCropDimensions(1280, 720)).toEqual({ width: 1280, height: 720 });
    });
  });

  describe("calcPadDimensions", () => {
    it("returns scaled source content dimensions for pad", () => {
      // 16:9 source into 4:3 target: scale = min(1440/1920, 1080/1080) = 0.75
      const result = calcPadDimensions(1920, 1080, 1440, 1080);
      expect(result.height).toBe(810); // 1080 * 0.75, content fits within target height
      expect(result.width).toBeCloseTo(1440, 0); // 1920 * 0.75
    });

    it("handles portrait source into landscape target", () => {
      // Portrait source into landscape: scale = min(1920/1080, 1080/1920) ≈ 0.562
      const result = calcPadDimensions(1080, 1920, 1920, 1080);
      expect(result.width).toBeCloseTo(608, 0); // 1080 * 0.562
      expect(result.height).toBeCloseTo(1080, 0); // 1920 * 0.562
    });
  });
});
