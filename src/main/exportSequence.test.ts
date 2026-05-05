import { describe, expect, it } from "vitest";
import { toSequenceOutputPattern } from "./exportSequence";

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
});
