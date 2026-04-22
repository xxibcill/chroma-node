import { describe, expect, it } from "vitest";
import { createRgbaFrameSequence } from "./exportSynthetic";

describe("createRgbaFrameSequence", () => {
  it("creates a deterministic RGBA frame buffer", () => {
    const buffer = createRgbaFrameSequence(4, 3, 2);

    expect(buffer.byteLength).toBe(4 * 3 * 4 * 2);
    expect(buffer[3]).toBe(255);
    expect(buffer[4 * 3 * 4 + 3]).toBe(255);
    expect(Buffer.compare(buffer.subarray(0, 4 * 3 * 4), buffer.subarray(4 * 3 * 4))).not.toBe(0);
  });
});
