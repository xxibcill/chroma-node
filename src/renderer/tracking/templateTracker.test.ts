import { describe, expect, it } from "vitest";
import type { PowerWindow } from "../../shared/colorEngine";
import type { LumaFrame } from "./templateTracker";
import { TrackingFailure, matchTranslation } from "./templateTracker";

const options = {
  searchRadiusPx: 10,
  minTemplateSizePx: 8,
  minTextureStandardDeviation: 2
};

describe("matchTranslation", () => {
  it("tracks simple horizontal motion", () => {
    const source = createPatternFrame(96, 72, 38, 29, 18, 14);
    const target = createPatternFrame(96, 72, 43, 29, 18, 14);

    const match = matchTranslation(source, target, trackingWindow(47, 36, 18, 14), 12, options);

    expect(match.dxPx).toBe(5);
    expect(match.dyPx).toBe(0);
    expect(match.confidence).toBeGreaterThan(0.98);
  });

  it("tracks simple vertical motion", () => {
    const source = createPatternFrame(96, 72, 38, 29, 18, 14);
    const target = createPatternFrame(96, 72, 38, 23, 18, 14);

    const match = matchTranslation(source, target, trackingWindow(47, 36, 18, 14), 12, options);

    expect(match.dxPx).toBe(0);
    expect(match.dyPx).toBe(-6);
    expect(match.confidence).toBeGreaterThan(0.98);
  });

  it("fails low-texture regions cleanly", () => {
    const frame = createFlatFrame(96, 72, 128);

    expect(() => matchTranslation(frame, frame, trackingWindow(47, 36, 18, 14), 12, options))
      .toThrow(TrackingFailure);
  });

  it("fails when the selected window is outside the usable frame", () => {
    const frame = createPatternFrame(96, 72, 38, 29, 18, 14);

    expect(() => matchTranslation(frame, frame, trackingWindow(2, 2, 18, 14), 12, options))
      .toThrow("outside the usable frame");
  });
});

function trackingWindow(centerX: number, centerY: number, width: number, height: number): PowerWindow {
  return {
    enabled: true,
    centerX: centerX / 96,
    centerY: centerY / 72,
    width: width / 96,
    height: height / 72,
    rotationDegrees: 0,
    softness: 0,
    invert: false
  };
}

function createFlatFrame(width: number, height: number, value: number): LumaFrame {
  return {
    width,
    height,
    data: new Uint8Array(width * height).fill(value)
  };
}

function createPatternFrame(
  width: number,
  height: number,
  left: number,
  top: number,
  objectWidth: number,
  objectHeight: number
): LumaFrame {
  const frame = createFlatFrame(width, height, 16);

  for (let y = 0; y < objectHeight; y += 1) {
    for (let x = 0; x < objectWidth; x += 1) {
      frame.data[(top + y) * width + left + x] = 72 + ((x * 17 + y * 31) % 160);
    }
  }

  return frame;
}
