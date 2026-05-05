import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultProject, type ChromaProject } from "../shared/project";
import { exportSequence, findExistingSequenceOutput, sequenceFrameOutputPath, toSequenceOutputPattern } from "./exportSequence";

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

  it("fails when the decoder exits before writing requested frames", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "chroma-sequence-"));
    const fakeFfmpeg = path.join(tempDir, "ffmpeg");
    await fs.writeFile(fakeFfmpeg, "#!/bin/sh\necho fake decode failure >&2\nexit 1\n", "utf8");
    await fs.chmod(fakeFfmpeg, 0o755);

    const previousFfmpegPath = process.env.CHROMA_NODE_FFMPEG_PATH;
    process.env.CHROMA_NODE_FFMPEG_PATH = fakeFfmpeg;

    try {
      await expect(exportSequence({
        project: createProjectFixture("/clips/missing.mp4"),
        outputPath: path.join(tempDir, "shot.png"),
        startFrame: 0,
        endFrame: 0
      })).rejects.toMatchObject({
        code: "EXPORT_FAILED",
        message: "FFmpeg could not decode the source media.",
        detail: "fake decode failure"
      });
    } finally {
      if (previousFfmpegPath === undefined) {
        delete process.env.CHROMA_NODE_FFMPEG_PATH;
      } else {
        process.env.CHROMA_NODE_FFMPEG_PATH = previousFfmpegPath;
      }
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});

function createProjectFixture(sourcePath: string): ChromaProject {
  return {
    ...createDefaultProject(),
    media: {
      id: "clip",
      sourcePath,
      fileName: path.basename(sourcePath),
      container: "mov,mp4",
      codec: "h264",
      width: 16,
      height: 16,
      displayWidth: 16,
      displayHeight: 16,
      durationSeconds: 1,
      frameRate: 24,
      totalFrames: 1,
      hasAudio: false,
      rotation: 0,
      videoStreamIndex: 0
    }
  };
}
