import { describe, expect, it } from "vitest";
import {
  clamp01,
  getContainedRect,
  getAnnotationOverlayGeometry,
  getWindowGeometry,
  normalizeSignedDegrees,
  readSvgPoint,
  rotatePixelPoint
} from "./viewerGeometry";

describe("viewerGeometry", () => {
  it("uses the shared contained-rect fit for viewer bounds", () => {
    expect(getContainedRect(1920, 1080, 1080, 1920)).toEqual({
      left: 656.25,
      top: 0,
      width: 607.5,
      height: 1080
    });
  });

  it("maps client coordinates into local svg coordinates", () => {
    const rect = { left: 100, top: 40 } as DOMRect;

    expect(readSvgPoint(128, 95, rect)).toEqual({ x: 28, y: 55 });
  });

  it("converts normalized window values to viewer pixels", () => {
    expect(getWindowGeometry(0.25, 0.75, 0.5, 0.2, {
      left: 10,
      top: 20,
      width: 800,
      height: 600
    })).toEqual({
      center: { x: 200, y: 450 },
      width: 400,
      height: 120
    });
  });

  it("rotates pixel points around the origin", () => {
    const rotated = rotatePixelPoint({ x: 10, y: 0 }, 90);

    expect(rotated.x).toBeCloseTo(0, 5);
    expect(rotated.y).toBeCloseTo(10, 5);
  });

  it("normalizes signed degrees into overlay control range", () => {
    expect(normalizeSignedDegrees(270)).toBe(-90);
    expect(normalizeSignedDegrees(-180)).toBe(180);
  });

  it("clamps normalized values to the unit interval", () => {
    expect(clamp01(-0.1)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(1.1)).toBe(1);
  });

  it("converts normalized annotation geometry to viewer pixels", () => {
    expect(getAnnotationOverlayGeometry({
      type: "rectangle",
      x: 0.25,
      y: 0.75,
      width: 0.2,
      height: 0.1,
      color: "#efcf95"
    }, {
      left: 0,
      top: 0,
      width: 800,
      height: 600
    })).toEqual({
      center: { x: 200, y: 450 },
      width: 160,
      height: 60
    });
  });
});
