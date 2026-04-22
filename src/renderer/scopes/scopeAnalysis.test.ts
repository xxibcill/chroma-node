import { describe, expect, it } from "vitest";
import { createColorNode } from "../../shared/colorEngine";
import {
  calculateRec709Chroma,
  calculateRec709Luma,
  createGradedScopeFrame,
  createVectorscopeHistogram,
  createWaveformHistogram
} from "./scopeAnalysis";

describe("scope analysis", () => {
  it("calculates Rec.709 luma for black, white, and channel-weighted pixels", () => {
    expect(calculateRec709Luma(0, 0, 0)).toBe(0);
    expect(calculateRec709Luma(255, 255, 255)).toBe(1);
    expect(calculateRec709Luma(255, 0, 0)).toBeCloseTo(0.2126, 4);
    expect(calculateRec709Luma(0, 255, 0)).toBeCloseTo(0.7152, 4);
    expect(calculateRec709Luma(0, 0, 255)).toBeCloseTo(0.0722, 4);
  });

  it("maps black and white pixels to the bottom and top waveform bins", () => {
    const frame = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([
        0, 0, 0, 255,
        255, 255, 255, 255
      ])
    };

    const waveform = createWaveformHistogram(frame, 2, 101);

    expect(waveform.bins[100 * 2]).toBe(1);
    expect(waveform.bins[1]).toBe(1);
  });

  it("preserves horizontal source position in the waveform histogram", () => {
    const frame = {
      width: 3,
      height: 1,
      data: new Uint8ClampedArray([
        128, 128, 128, 255,
        128, 128, 128, 255,
        128, 128, 128, 255
      ])
    };

    const waveform = createWaveformHistogram(frame, 5, 5);
    const populatedBins = Array.from(waveform.bins.entries())
      .filter(([, value]) => value > 0)
      .map(([index]) => index % waveform.width);

    expect(populatedBins).toEqual([0, 2, 4]);
  });

  it("clusters neutral grayscale near the vectorscope center", () => {
    const frame = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([128, 128, 128, 255])
    };

    const vectorscope = createVectorscopeHistogram(frame, 9);
    const centerIndex = 4 * vectorscope.width + 4;

    expect(vectorscope.bins[centerIndex]).toBe(1);
  });

  it("pushes saturated colors away from the vectorscope center", () => {
    const neutral = calculateRec709Chroma(128, 128, 128);
    const red = calculateRec709Chroma(255, 0, 0);
    const neutralMagnitude = Math.hypot(neutral.cb, neutral.cr);
    const redMagnitude = Math.hypot(red.cb, red.cr);

    expect(neutralMagnitude).toBeCloseTo(0, 6);
    expect(redMagnitude).toBeGreaterThan(0.45);
  });

  it("builds scope input from graded output after enabled serial nodes", () => {
    const node = createColorNode(1);
    node.primaries.offset = { r: 0.25, g: 0.25, b: 0.25 };
    const source = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([64, 64, 64, 255])
    };

    const graded = createGradedScopeFrame(source, [node]);

    expect(graded.data[0]).toBeGreaterThan(source.data[0]);
    expect(graded.data[1]).toBeGreaterThan(source.data[1]);
    expect(graded.data[2]).toBeGreaterThan(source.data[2]);
  });
});
