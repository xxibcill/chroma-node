import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSupportBundle } from "./supportStore";
import { createDefaultProject } from "../shared/project";

const electronMock = vi.hoisted(() => ({
  logsPath: "",
  userDataPath: ""
}));

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn((name: string) => name === "logs" ? electronMock.logsPath : electronMock.userDataPath),
    getVersion: vi.fn(() => "0.0.0-test")
  }
}));

vi.mock("./ffmpeg.js", () => ({
  getFfmpegDiagnostics: vi.fn(async () => ({
    available: true,
    ffmpegPath: "/Users/jjae/bin/ffmpeg",
    ffprobePath: "/Users/jjae/bin/ffprobe",
    ffmpegVersion: "ffmpeg test",
    ffprobeVersion: "ffprobe test",
    h264EncoderAvailable: true,
    hevcEncoderAvailable: true,
    proresEncoderAvailable: true,
    vp9EncoderAvailable: true,
    errors: []
  }))
}));

vi.mock("./projectFile.js", () => ({
  getCurrentProject: vi.fn(() => ({
    ...createDefaultProject(),
    name: "Support Test",
    media: {
      id: "media-1",
      sourcePath: "/Users/jjae/Videos/client.mov",
      fileName: "client.mov",
      width: 1920,
      height: 1080,
      displayWidth: 1920,
      displayHeight: 1080,
      durationSeconds: 10,
      frameRate: 24,
      totalFrames: 240,
      codec: "h264",
      container: "mov",
      hasAudio: true
    }
  }))
}));

describe("supportStore", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "chroma-support-"));
    electronMock.userDataPath = path.join(tempDir, "user-data");
    electronMock.logsPath = path.join(tempDir, "logs");
    await fs.mkdir(electronMock.logsPath, { recursive: true });
    await fs.writeFile(
      path.join(electronMock.logsPath, "app.log"),
      "Opened /Users/jjae/Videos/client.mov for maya@example.com",
      "utf8"
    );
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("redacts diagnostic values, media paths, and logs in support bundles", async () => {
    const result = await createSupportBundle({
      includeLogs: true,
      includeProjectDiagnostics: true,
      includeMediaMetadata: true,
      redactPaths: true
    });

    expect(result.manifest.redacted).toBe(true);
    expect(result.manifest.mediaMetadata?.sourcePath).toBe("REDACTED");
    expect(result.manifest.diagnostics.find((entry) => entry.key === "ffmpeg_path")?.value).toBe("/Users/REDACTED/bin/ffmpeg");
    expect(result.manifest.logs?.join("\n")).toContain("/Users/REDACTED/");
    expect(result.manifest.logs?.join("\n")).toContain("user@REDACTED");
  });
});
