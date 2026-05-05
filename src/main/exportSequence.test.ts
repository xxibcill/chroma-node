import { describe, expect, it } from "vitest";
import { findExistingSequenceOutput, sequenceFrameOutputPath, toSequenceOutputPattern } from "./exportSequence";

describe("export sequence planning", () => {
  it("keeps explicit frame patterns unchanged", () => {
    expect(toSequenceOutputPattern("/tmp/shot-%04d.png")).toBe("/tmp/shot-%04d.png");
  });

  it("adds a frame pattern before the png extension", () => {
    expect(toSequenceOutputPattern("/tmp/shot.png")).toBe("/tmp/shot-%04d.png");
  });

  it("normalizes paths without a png extension", () => {
    expect(toSequenceOutputPattern("/tmp/shot")).toBe("/tmp/shot-%04d.png");
  });

  it("formats frame paths from the normalized pattern", () => {
    expect(sequenceFrameOutputPath("/tmp/shot.png", 12)).toBe("/tmp/shot-0012.png");
  });

  it("finds conflicts beyond the first sequence frame", async () => {
    const existing = new Set(["/tmp/shot-0012.png"]);
    const conflict = await findExistingSequenceOutput("/tmp/shot.png", 10, 12, async (framePath) => existing.has(framePath));

    expect(conflict).toBe("/tmp/shot-0012.png");
  });

  it("returns undefined when no sequence frame exists", async () => {
    const conflict = await findExistingSequenceOutput("/tmp/shot.png", 10, 12, async () => false);

    expect(conflict).toBeUndefined();
  });
});
