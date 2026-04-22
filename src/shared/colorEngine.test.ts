import { describe, expect, it } from "vitest";
import {
  createDefaultPowerWindows,
  createColorNode,
  createNeutralPrimaries,
  evaluateNodeMask,
  evaluateNodeGraph,
  evaluatePowerWindowMask,
  evaluateQualifierMask,
  generateColorFragmentShader,
  sanitizePrimaries
} from "./colorEngine";

describe("color engine", () => {
  it("leaves pixels unchanged for a neutral graph", () => {
    const pixel = { r: 0.2, g: 0.4, b: 0.8, a: 1 };
    expect(evaluateNodeGraph(pixel, [createColorNode(1)])).toEqual(pixel);
  });

  it("passes input through unchanged when a node is disabled", () => {
    const node = createColorNode(1);
    node.enabled = false;
    node.primaries.offset = { r: 0.4, g: -0.3, b: 0.2 };

    expect(evaluateNodeGraph({ r: 0.2, g: 0.4, b: 0.8 }, [node])).toEqual({ r: 0.2, g: 0.4, b: 0.8 });
  });

  it("evaluates serial nodes in order", () => {
    const first = createColorNode(1);
    const second = createColorNode(2);
    first.primaries.offset = { r: 0.1, g: 0, b: 0 };
    second.primaries.gain = { r: 2, g: 1, b: 1 };

    const result = evaluateNodeGraph({ r: 0.2, g: 0.4, b: 0.8 }, [first, second]);
    expect(result.r).toBeCloseTo(0.6, 6);
    expect(result.g).toBeCloseTo(0.4, 6);
    expect(result.b).toBeCloseTo(0.8, 6);
  });

  it("clamps primary controls to MVP ranges", () => {
    const primaries = sanitizePrimaries({
      ...createNeutralPrimaries(),
      gamma: { r: -1, g: 10, b: 1 },
      saturation: 99,
      temperature: -4
    });

    expect(primaries.gamma.r).toBe(0.1);
    expect(primaries.gamma.g).toBe(3);
    expect(primaries.saturation).toBe(2);
    expect(primaries.temperature).toBe(-1);
  });

  it("generates bounded WebGL shaders for one to three serial nodes", () => {
    expect(generateColorFragmentShader(1)).toContain("uniform int uEnabled[1]");
    expect(generateColorFragmentShader(2)).toContain("if (uEnabled[1] == 1)");
    expect(generateColorFragmentShader(3)).toContain("uniform vec3 uLift[3]");
    expect(generateColorFragmentShader(99)).toContain("uniform int uEnabled[3]");
    expect(generateColorFragmentShader(1)).toContain("uniform int uQualifierEnabled[1]");
    expect(generateColorFragmentShader(1)).toContain("float nodeMask(vec3 color, int index, vec2 coord)");
  });

  it("returns a full mask when the qualifier is disabled", () => {
    const node = createColorNode(1);

    expect(evaluateQualifierMask({ r: 0, g: 0, b: 1 }, node.qualifier)).toBe(1);
  });

  it("wraps hue ranges around red", () => {
    const node = createColorNode(1);
    node.qualifier = {
      ...node.qualifier,
      enabled: true,
      hueCenter: 0,
      hueWidth: 24,
      saturationMin: 0.4,
      saturationMax: 1,
      luminanceMin: 0,
      luminanceMax: 1
    };

    expect(evaluateQualifierMask({ r: 1, g: 0.02, b: 0.08 }, node.qualifier)).toBe(1);
    expect(evaluateQualifierMask({ r: 0, g: 1, b: 0 }, node.qualifier)).toBe(0);
  });

  it("creates grayscale qualifier mattes with softness and supports invert", () => {
    const node = createColorNode(1);
    node.qualifier = {
      ...node.qualifier,
      enabled: true,
      hueCenter: 120,
      hueWidth: 20,
      hueSoftness: 40,
      saturationMin: 0,
      saturationMax: 1,
      luminanceMin: 0,
      luminanceMax: 1
    };

    const softMask = evaluateQualifierMask({ r: 0.5, g: 1, b: 0 }, node.qualifier);
    expect(softMask).toBeGreaterThan(0);
    expect(softMask).toBeLessThan(1);

    node.qualifier.invert = true;
    expect(evaluateQualifierMask({ r: 0, g: 1, b: 0 }, node.qualifier)).toBe(0);
  });

  it("evaluates ellipse and rotated rectangle power windows", () => {
    const windows = createDefaultPowerWindows();
    windows.ellipse = {
      ...windows.ellipse,
      enabled: true,
      centerX: 0.5,
      centerY: 0.5,
      width: 0.4,
      height: 0.4
    };

    expect(evaluatePowerWindowMask({ x: 0.5, y: 0.5 }, windows)).toBe(1);
    expect(evaluatePowerWindowMask({ x: 0.9, y: 0.9 }, windows)).toBe(0);

    windows.ellipse.enabled = false;
    windows.rectangle = {
      ...windows.rectangle,
      enabled: true,
      centerX: 0.5,
      centerY: 0.5,
      width: 0.8,
      height: 0.2,
      rotationDegrees: 45
    };

    expect(evaluatePowerWindowMask({ x: 0.64, y: 0.64 }, windows)).toBe(1);
    expect(evaluatePowerWindowMask({ x: 0.75, y: 0.5 }, windows)).toBe(0);
  });

  it("unions enabled windows and multiplies the union by qualifier masks", () => {
    const node = createColorNode(1);
    node.qualifier = {
      ...node.qualifier,
      enabled: true,
      hueCenter: 240,
      hueWidth: 30
    };
    node.windows.ellipse = {
      ...node.windows.ellipse,
      enabled: true,
      centerX: 0.25,
      centerY: 0.5,
      width: 0.2,
      height: 0.2
    };
    node.windows.rectangle = {
      ...node.windows.rectangle,
      enabled: true,
      centerX: 0.75,
      centerY: 0.5,
      width: 0.2,
      height: 0.2
    };

    expect(evaluateNodeMask({ r: 0, g: 0, b: 1 }, node, { x: 0.25, y: 0.5 })).toBe(1);
    expect(evaluateNodeMask({ r: 0, g: 0, b: 1 }, node, { x: 0.75, y: 0.5 })).toBe(1);
    expect(evaluateNodeMask({ r: 0, g: 0, b: 1 }, node, { x: 0.5, y: 0.5 })).toBe(0);
    expect(evaluateNodeMask({ r: 1, g: 0, b: 0 }, node, { x: 0.25, y: 0.5 })).toBe(0);
  });

  it("blends masked corrections against the node input", () => {
    const node = createColorNode(1);
    node.primaries.offset = { r: 0.4, g: 0, b: 0 };
    node.qualifier = {
      ...node.qualifier,
      enabled: true,
      hueCenter: 0,
      hueWidth: 30
    };

    const selected = evaluateNodeGraph({ r: 0.5, g: 0, b: 0 }, [node]);
    const rejected = evaluateNodeGraph({ r: 0, g: 0.5, b: 0 }, [node]);

    expect(selected.r).toBeCloseTo(0.9, 6);
    expect(rejected.r).toBeCloseTo(0, 6);
  });
});
