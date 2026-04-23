import path from "node:path";
import { describe, expect, it } from "vitest";
import { createColorNode } from "../shared/colorEngine";
import { createDefaultProject, type ChromaProject } from "../shared/project";
import { createExportJobSnapshot, renderRgbaFrame } from "./exportProject";

describe("export project job model", () => {
  it("creates an immutable export snapshot from project state", () => {
    const project = createProjectFixture();
    project.nodes[0].primaries.offset = { r: 0.2, g: 0, b: 0 };

    const snapshot = createExportJobSnapshot({
      project,
      outputPath: path.join(process.cwd(), "tmp", "graded.mp4"),
      quality: "high"
    });
    project.nodes[0].primaries.offset = { r: 0, g: 0.2, b: 0 };

    expect(snapshot.quality).toBe("high");
    expect(snapshot.media.sourcePath).toBe("/clips/source.mp4");
    expect(snapshot.project.nodes[0].primaries.offset).toEqual({ r: 0.2, g: 0, b: 0 });
  });

  it("rejects exports without media", () => {
    expect(() =>
      createExportJobSnapshot({
        project: createDefaultProject(),
        outputPath: path.join(process.cwd(), "tmp", "graded.mp4")
      })
    ).toThrow(/media/);
  });

  it("rejects non-MP4 output paths", () => {
    expect(() =>
      createExportJobSnapshot({
        project: createProjectFixture(),
        outputPath: path.join(process.cwd(), "tmp", "graded.mov")
      })
    ).toThrow(/\.mp4/);
  });
});

describe("renderRgbaFrame", () => {
  it("keeps neutral frames unchanged before encode", () => {
    const frame = Buffer.from([
      20, 40, 60, 255,
      100, 120, 140, 255
    ]);

    expect(renderRgbaFrame(frame, 2, 1, [createColorNode(1)], 0)).toEqual(frame);
  });

  it("applies serial node corrections", () => {
    const node = createColorNode(1);
    node.primaries.offset = { r: 0.25, g: 0, b: 0 };
    const frame = Buffer.from([64, 64, 64, 255]);
    const rendered = renderRgbaFrame(frame, 1, 1, [node], 0);

    expect(rendered[0]).toBeGreaterThan(frame[0]);
    expect(rendered[1]).toBe(frame[1]);
    expect(rendered[2]).toBe(frame[2]);
    expect(rendered[3]).toBe(255);
  });

  it("resolves tracking keyframes when rendering masks", () => {
    const node = createColorNode(1);
    node.primaries.offset = { r: 0.5, g: 0, b: 0 };
    node.windows.ellipse = {
      ...node.windows.ellipse,
      enabled: true,
      centerX: 0.25,
      centerY: 0.5,
      width: 0.6,
      height: 0.6
    };
    node.tracking = {
      targetShape: "ellipse",
      state: "ready",
      keyframes: [{ frame: 1, dx: 0.5, dy: 0, confidence: 1 }]
    };
    const frame = Buffer.alloc(4 * 4 * 4, 80);
    for (let index = 3; index < frame.length; index += 4) {
      frame[index] = 255;
    }

    const rendered = renderRgbaFrame(frame, 4, 4, [node], 1);
    const shiftedCenterOffset = (2 * 4 + 3) * 4;
    const originalCenterOffset = (2 * 4 + 1) * 4;

    expect(rendered[shiftedCenterOffset]).toBeGreaterThan(frame[shiftedCenterOffset]);
    expect(rendered[originalCenterOffset]).toBe(frame[originalCenterOffset]);
  });
});

function createProjectFixture(): ChromaProject {
  return {
    ...createDefaultProject(),
    media: {
      id: "clip",
      sourcePath: "/clips/source.mp4",
      fileName: "source.mp4",
      container: "mov,mp4",
      codec: "h264",
      width: 4,
      height: 4,
      durationSeconds: 1,
      frameRate: 24,
      totalFrames: 24,
      hasAudio: true,
      rotation: 0,
      videoStreamIndex: 0
    }
  };
}
