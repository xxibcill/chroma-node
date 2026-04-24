import { describe, expect, it } from "vitest";
import {
  createColorNode,
  createNeutralPrimaries,
  evaluateNodeGraph,
  evaluateNodeMask,
  createDefaultPowerWindows
} from "./colorEngine";

describe("color engine shader parity", () => {
  it("evaluates neutral primaries as identity transform", () => {
    const node = createColorNode(1);
    const neutral = { r: 0.5, g: 0.5, b: 0.5, a: 1 };
    const result = evaluateNodeGraph(neutral, [node]);
    expect(result.r).toBeCloseTo(0.5, 4);
    expect(result.g).toBeCloseTo(0.5, 4);
    expect(result.b).toBeCloseTo(0.5, 4);
  });

  it("applies lift to shadows", () => {
    const node = createColorNode(1);
    node.primaries.lift = { r: 0.1, g: 0.1, b: 0.1 };
    const dark = { r: 0.1, g: 0.1, b: 0.1, a: 1 };
    const result = evaluateNodeGraph(dark, [node]);
    expect(result.r).toBeGreaterThan(dark.r);
    expect(result.g).toBeGreaterThan(dark.g);
    expect(result.b).toBeGreaterThan(dark.b);
  });

  it("applies gain to highlights", () => {
    const node = createColorNode(1);
    node.primaries.gain = { r: 1.5, g: 1.5, b: 1.5 };
    const bright = { r: 0.8, g: 0.8, b: 0.8, a: 1 };
    const result = evaluateNodeGraph(bright, [node]);
    expect(result.r).toBeGreaterThan(bright.r);
    expect(result.g).toBeGreaterThan(bright.g);
    expect(result.b).toBeGreaterThan(bright.b);
  });

  it("applies offset uniformly", () => {
    const node = createColorNode(1);
    node.primaries.offset = { r: 0.1, g: -0.05, b: 0.05 };
    const mid = { r: 0.5, g: 0.5, b: 0.5, a: 1 };
    const result = evaluateNodeGraph(mid, [node]);
    expect(result.r).toBeCloseTo(0.6, 4);
    expect(result.g).toBeCloseTo(0.45, 4);
    expect(result.b).toBeCloseTo(0.55, 4);
  });

  it("applies contrast around pivot", () => {
    const node = createColorNode(1);
    node.primaries.contrast = 1.5;
    node.primaries.pivot = 0.5;
    const mid = { r: 0.5, g: 0.5, b: 0.5, a: 1 };
    const result = evaluateNodeGraph(mid, [node]);
    expect(result.r).toBeCloseTo(0.5, 4);
    expect(result.g).toBeCloseTo(0.5, 4);
    expect(result.b).toBeCloseTo(0.5, 4);
  });

  it("applies saturation correctly", () => {
    const node = createColorNode(1);
    node.primaries.saturation = 0.5;
    const gray = { r: 0.5, g: 0.5, b: 0.5, a: 1 };
    const result = evaluateNodeGraph(gray, [node]);
    expect(result.r).toBeCloseTo(0.5, 4);
    expect(result.g).toBeCloseTo(0.5, 4);
    expect(result.b).toBeCloseTo(0.5, 4);
  });

  it("evaluates multiple nodes serially", () => {
    const first = createColorNode(1);
    first.primaries.gain = { r: 2, g: 1, b: 1 };
    const second = createColorNode(2);
    second.primaries.offset = { r: -0.1, g: 0, b: 0 };
    const input = { r: 0.25, g: 0.5, b: 0.75, a: 1 };
    const result = evaluateNodeGraph(input, [first, second]);
    expect(result.r).toBeCloseTo(0.4, 4);
    expect(result.g).toBeCloseTo(0.5, 4);
    expect(result.b).toBeCloseTo(0.75, 4);
  });

  it("bypasses disabled nodes", () => {
    const first = createColorNode(1);
    first.enabled = false;
    first.primaries.gain = { r: 10, g: 10, b: 10 };
    const second = createColorNode(2);
    second.primaries.gain = { r: 2, g: 1, b: 1 };
    const input = { r: 0.25, g: 0.5, b: 0.75, a: 1 };
    const result = evaluateNodeGraph(input, [first, second]);
    expect(result.r).toBeCloseTo(0.5, 4);
    expect(result.g).toBeCloseTo(0.5, 4);
    expect(result.b).toBeCloseTo(0.75, 4);
  });

  it("applies temperature shift toward warm", () => {
    const node = createColorNode(1);
    node.primaries.temperature = 0.5;
    const neutral = { r: 0.5, g: 0.5, b: 0.5, a: 1 };
    const result = evaluateNodeGraph(neutral, [node]);
    expect(result.r).toBeGreaterThan(result.g);
  });

  it("applies temperature shift toward cool", () => {
    const node = createColorNode(1);
    node.primaries.temperature = -0.5;
    const neutral = { r: 0.5, g: 0.5, b: 0.5, a: 1 };
    const result = evaluateNodeGraph(neutral, [node]);
    expect(result.b).toBeGreaterThan(result.r);
  });

  it("clamps output to valid range", () => {
    const node = createColorNode(1);
    node.primaries.gain = { r: 10, g: 10, b: 10 };
    node.primaries.offset = { r: 5, g: 5, b: 5 };
    const input = { r: 1, g: 1, b: 1, a: 1 };
    const result = evaluateNodeGraph(input, [node]);
    expect(result.r).toBeLessThanOrEqual(1);
    expect(result.g).toBeLessThanOrEqual(1);
    expect(result.b).toBeLessThanOrEqual(1);
    expect(result.r).toBeGreaterThanOrEqual(0);
    expect(result.g).toBeGreaterThanOrEqual(0);
    expect(result.b).toBeGreaterThanOrEqual(0);
  });
});

describe("color engine mask evaluation", () => {
  it("returns full mask when all windows are disabled", () => {
    const node = createColorNode(1);
    node.windows.ellipse.enabled = false;
    node.windows.rectangle.enabled = false;
    const pixel = { r: 0.5, g: 0.5, b: 0.5, a: 1 };
    const mask = evaluateNodeMask(pixel, node, { x: 0.5, y: 0.5 });
    expect(mask).toBe(1);
  });

  it("returns full mask when qualifier disabled with invert", () => {
    const node = createColorNode(1);
    node.qualifier = {
      ...node.qualifier,
      enabled: false,
      invert: true
    };
    const pixel = { r: 0.5, g: 0.5, b: 0.5, a: 1 };
    const mask = evaluateNodeMask(pixel, node, { x: 0.5, y: 0.5 });
    expect(mask).toBe(1);
  });

  it("window overlay does not affect mask when windows disabled", () => {
    const node = createColorNode(1);
    node.windows.ellipse.enabled = false;
    node.windows.rectangle.enabled = false;
    const pixel = { r: 0.5, g: 0.5, b: 0.5, a: 1 };
    const mask = evaluateNodeMask(pixel, node, { x: 0.0, y: 0.0 });
    expect(mask).toBe(1);
  });

  it("clamps primaries to valid ranges", () => {
    const node = createColorNode(1);
    node.primaries = {
      lift: { r: 100, g: -100, b: 0 },
      gamma: { r: 0.01, g: 10, b: 1 },
      gain: { r: 0, g: 5, b: 1 },
      offset: { r: 2, g: -2, b: 0 },
      contrast: 99,
      pivot: 0.5,
      saturation: 99,
      temperature: 99,
      tint: -99
    };
    expect(evaluateNodeGraph({ r: 0.5, g: 0.5, b: 0.5, a: 1 }, [node]).r).toBeLessThanOrEqual(1);
  });
});
