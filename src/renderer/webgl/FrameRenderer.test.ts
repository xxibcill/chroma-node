import { describe, expect, it } from "vitest";
import { containScale } from "./FrameRenderer";

describe("containScale", () => {
  it("letterboxes wide canvases without stretching the frame", () => {
    expect(containScale(1920, 1080, 1080, 1080)).toEqual({ x: 0.5625, y: 1 });
  });

  it("pillarboxes tall canvases without stretching the frame", () => {
    expect(containScale(1080, 1920, 1920, 1080)).toEqual({ x: 1, y: 0.31640625 });
  });
});
