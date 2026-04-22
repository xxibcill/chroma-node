import { describe, expect, it } from "vitest";
import {
  createColorNode,
  createNeutralPrimaries,
  evaluateNodeGraph,
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
  });
});
