import { describe, expect, it, vi, beforeEach } from "vitest";
import { relinkMedia } from "./mediaRelink";
import * as mediaProbeModule from "./mediaProbe";
import { existsSync } from "node:fs";

vi.mock("node:fs", () => ({
  existsSync: vi.fn()
}));

vi.mock("./mediaProbe", () => ({
  probeMedia: vi.fn()
}));

describe("relinkMedia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when replacement file does not exist", async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const result = await relinkMedia("/original/path.mp4", "/nonexistent/path.mp4");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("FILE_NOT_FOUND");
    }
  });

  it("returns error when probe fails", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(mediaProbeModule.probeMedia).mockRejectedValue(new Error("Probe failed"));
    const result = await relinkMedia("/original/path.mp4", "/replacement/path.mp4");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PROBE_FAILED");
    }
  });

  it("returns error when replacement exceeds max resolution", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(mediaProbeModule.probeMedia).mockResolvedValue({
      id: "test",
      sourcePath: "/replacement/path.mp4",
      fileName: "path.mp4",
      container: "mp4",
      codec: "h264",
      width: 3840,
      height: 2160,
      durationSeconds: 10,
      frameRate: 24,
      hasAudio: false,
      rotation: 0,
      videoStreamIndex: 0
    });
    const result = await relinkMedia("/original/path.mp4", "/replacement/path.mp4");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNSUPPORTED_MEDIA");
      expect(result.error.message).toContain("1920x1080");
    }
  });

  it("returns error when replacement has unsupported codec", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(mediaProbeModule.probeMedia).mockResolvedValue({
      id: "test",
      sourcePath: "/replacement/path.avi",
      fileName: "path.avi",
      container: "avi",
      codec: "divx",
      width: 1920,
      height: 1080,
      durationSeconds: 10,
      frameRate: 24,
      hasAudio: false,
      rotation: 0,
      videoStreamIndex: 0
    });
    const result = await relinkMedia("/original/path.mp4", "/replacement/path.avi");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNSUPPORTED_MEDIA");
    }
  });

  it("returns media when replacement is valid H.264 MP4", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const validMedia = {
      id: "test",
      sourcePath: "/replacement/path.mp4",
      fileName: "path.mp4",
      container: "mp4",
      codec: "h264",
      width: 1920,
      height: 1080,
      durationSeconds: 10,
      frameRate: 24,
      hasAudio: false,
      rotation: 0,
      videoStreamIndex: 0
    };
    vi.mocked(mediaProbeModule.probeMedia).mockResolvedValue(validMedia);
    const result = await relinkMedia("/original/path.mp4", "/replacement/path.mp4");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.media).toEqual(validMedia);
    }
  });

  it("returns media when replacement is valid H.264 MOV", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const validMedia = {
      id: "test",
      sourcePath: "/replacement/path.mov",
      fileName: "path.mov",
      container: "mov",
      codec: "avc1",
      width: 1280,
      height: 720,
      durationSeconds: 10,
      frameRate: 30,
      hasAudio: true,
      rotation: 0,
      videoStreamIndex: 0
    };
    vi.mocked(mediaProbeModule.probeMedia).mockResolvedValue(validMedia);
    const result = await relinkMedia("/original/path.mp4", "/replacement/path.mov");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.media.codec).toBe("avc1");
    }
  });
});
