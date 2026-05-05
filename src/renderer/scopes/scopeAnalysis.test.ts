import { describe, expect, it } from "vitest";
import { createColorNode } from "../../shared/colorEngine";
import {
  analyzeExposureMonitor,
  calculateRec709Chroma,
  calculateRec709Luma,
  classifyPixelFalseColor,
  createChannelWaveformHistogram,
  createChannelParadeHistogram,
  createCieHistogram,
  createCumulativeHistogram,
  createFalseColorOverlay,
  createGradedScopeFrame,
  createHdrParadeHistogram,
  createHdrWaveformHistogram,
  createHueHistogram,
  createLogHistogram,
  createSaturationHistogram,
  createVectorscopeHistogram,
  createWaveformHistogram,
  createYcbcrParadeHistogram,
  createYcbcrWaveformHistogram,
  createYrgbParadeHistogram,
  createZoneHistogram
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

  it("creates YCbCr waveform with Y, Cb, and Cr bins", () => {
    const frame = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([
        128, 128, 128, 255,
        255, 128, 128, 255
      ])
    };

    const waveform = createYcbcrWaveformHistogram(frame, 4, 4);
    expect(waveform.yBins).toBeDefined();
    expect(waveform.cbBins).toBeDefined();
    expect(waveform.crBins).toBeDefined();
    expect(waveform.samples).toBe(2);
  });

  it("creates HDR waveform with nit scaling", () => {
    const frame = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([
        128, 128, 128, 255,
        255, 255, 255, 255
      ])
    };

    const waveform = createHdrWaveformHistogram(frame, 4, 4, 1000);
    expect(waveform.maxNit).toBe(1000);
    expect(waveform.bins).toBeDefined();
    expect(waveform.samples).toBe(2);
  });

  it("creates per-channel waveform with separate R, G, B bins", () => {
    const frame = {
      width: 3,
      height: 1,
      data: new Uint8ClampedArray([
        255, 0, 0, 255,
        0, 255, 0, 255,
        0, 0, 255, 255
      ])
    };

    const waveform = createChannelWaveformHistogram(frame, 6, 4);
    expect(waveform.redBins).toBeDefined();
    expect(waveform.greenBins).toBeDefined();
    expect(waveform.blueBins).toBeDefined();
    expect(waveform.samples).toBe(3);
  });

  it("creates YRGB parade with Y, R, G, B channel bins", () => {
    const frame = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([
        128, 128, 128, 255,
        255, 128, 128, 255
      ])
    };

    const parade = createYrgbParadeHistogram(frame, 4, 4);
    expect(parade.yBins).toBeDefined();
    expect(parade.redBins).toBeDefined();
    expect(parade.greenBins).toBeDefined();
    expect(parade.blueBins).toBeDefined();
    expect(parade.samples).toBe(2);
  });

  it("creates YCbCr parade with Y, Cb, Cr channel bins", () => {
    const frame = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([
        128, 128, 128, 255,
        255, 128, 128, 255
      ])
    };

    const parade = createYcbcrParadeHistogram(frame, 4, 4);
    expect(parade.yBins).toBeDefined();
    expect(parade.cbBins).toBeDefined();
    expect(parade.crBins).toBeDefined();
    expect(parade.samples).toBe(2);
  });

  it("creates HDR parade with nit-scaled channels", () => {
    const frame = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([
        128, 128, 128, 255,
        255, 255, 255, 255
      ])
    };

    const parade = createHdrParadeHistogram(frame, 4, 4, 1000);
    expect(parade.maxNit).toBe(1000);
    expect(parade.redBins).toBeDefined();
    expect(parade.greenBins).toBeDefined();
    expect(parade.blueBins).toBeDefined();
    expect(parade.samples).toBe(2);
  });

  it("creates channel-isolated parade for a single channel", () => {
    const frame = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([
        128, 128, 128, 255,
        255, 128, 128, 255
      ])
    };

    const parade = createChannelParadeHistogram(frame, 4, 4, "red");
    expect(parade.channelBins).toBeDefined();
    expect(parade.samples).toBe(2);
  });

  it("creates log histogram with log-scaled bins", () => {
    const frame = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([
        1, 1, 1, 255,
        255, 255, 255, 255
      ])
    };

    const hist = createLogHistogram(frame, 64);
    expect(hist.redBins).toBeDefined();
    expect(hist.greenBins).toBeDefined();
    expect(hist.blueBins).toBeDefined();
    expect(hist.samples).toBe(2);
  });

  it("creates cumulative histogram with running sums", () => {
    const frame = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([
        128, 128, 128, 255,
        200, 200, 200, 255
      ])
    };

    const hist = createCumulativeHistogram(frame, 256);
    expect(hist.totalPixels).toBeGreaterThan(0);
    expect(hist.redBins[hist.redBins.length - 1]).toBeGreaterThan(hist.redBins[0]);
  });

  it("creates saturation histogram", () => {
    const frame = {
      width: 3,
      height: 1,
      data: new Uint8ClampedArray([
        255, 0, 0, 255,
        128, 128, 128, 255,
        0, 255, 0, 255
      ])
    };

    const hist = createSaturationHistogram(frame, 180);
    expect(hist.saturationBins).toBeDefined();
    expect(hist.samples).toBe(3);
  });

  it("creates hue histogram", () => {
    const frame = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([
        255, 0, 0, 255,
        0, 255, 0, 255
      ])
    };

    const hist = createHueHistogram(frame, 180);
    expect(hist.hueBins).toBeDefined();
    expect(hist.samples).toBe(2);
  });

  it("creates zone histogram with 10 zones", () => {
    const frame = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([
        0, 0, 0, 255,
        255, 255, 255, 255
      ])
    };

    const hist = createZoneHistogram(frame);
    expect(hist.zoneBins.length).toBe(10);
    expect(hist.zoneNames.length).toBe(10);
    expect(hist.samples).toBe(2);
  });

  it("creates CIE histogram for both 1931 and 1976 variants", () => {
    const frame = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([
        255, 128, 128, 255,
        128, 255, 128, 255
      ])
    };

    const cie1931 = createCieHistogram(frame, 64, "cie1931");
    expect(cie1931.variant).toBe("cie1931");
    expect(cie1931.bins).toBeDefined();

    const cie1976 = createCieHistogram(frame, 64, "cie1976");
    expect(cie1976.variant).toBe("cie1976");
    expect(cie1976.bins).toBeDefined();
  });

  it("analyzes exposure with zone distribution", () => {
    const frame = {
      width: 3,
      height: 1,
      data: new Uint8ClampedArray([
        0, 0, 0, 255,
        128, 128, 128, 255,
        255, 255, 255, 255
      ])
    };

    const stats = analyzeExposureMonitor(frame);
    expect(stats.samples).toBe(3);
    expect(stats.clipping).toBeGreaterThanOrEqual(2);
    expect(stats.superBlacks).toBe(1);
    expect(stats.superWhites).toBe(1);
  });

  it("classifies pixels into false color ranges", () => {
    const blackRange = classifyPixelFalseColor(0, 0, 0, false, 1000);
    expect(blackRange?.label).toBe("Blacks");

    const midRange = classifyPixelFalseColor(128, 128, 128, false, 1000);
    expect(midRange?.label).toBe("Midtones");

    const hdrRange = classifyPixelFalseColor(255, 255, 255, true, 1000);
    expect(hdrRange?.min).toBeGreaterThanOrEqual(1000);
  });

  it("creates false color overlay for SDR", () => {
    const frame = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([
        0, 0, 0, 255,
        255, 255, 255, 255
      ])
    };

    const overlay = createFalseColorOverlay(frame, false);
    expect(overlay.length).toBe(frame.data.length);
    expect(overlay[3]).toBe(180);
    expect(overlay[0]).toBeLessThan(50);
    expect(overlay[4]).toBeGreaterThan(200);
    expect(overlay[5]).toBeGreaterThan(200);
    expect(overlay[6]).toBeGreaterThan(200);
  });
});
