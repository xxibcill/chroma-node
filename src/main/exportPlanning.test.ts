import { describe, expect, it } from "vitest";
import { computeExportFps, computeExportGeometry, createExportJobSnapshot, planExportGeometry, validateExportGeometry, validateExportRequest } from "./exportPlanning";

const createMockMedia = (overrides = {}) => ({
  id: "test-media",
  sourcePath: "/path/to/media.mp4",
  fileName: "media.mp4",
  container: "mp4",
  codec: "h264",
  width: 1920,
  height: 1080,
  displayWidth: 1920,
  displayHeight: 1080,
  durationSeconds: 10,
  frameRate: 24,
  totalFrames: 240,
  hasAudio: false,
  rotation: 0,
  videoStreamIndex: 0,
  ...overrides
});

const createMockProject = (overrides = {}) => ({
  schemaVersion: "1.0.0",
  projectId: "test-project",
  name: "Test Project",
  playback: {
    currentFrame: 0,
    viewerMode: "graded" as const,
    splitPosition: 0.5
  },
  nodes: [],
  exportSettings: {
    codec: "h264" as const,
    quality: "standard" as const,
    sizeMode: "source" as const,
    resizePolicy: "fit" as const
  },
  ...overrides
});

describe("exportPlanning", () => {
  describe("validateExportRequest", () => {
    it("returns no issues for valid request", () => {
      const project = createMockProject({
        media: createMockMedia()
      });
      const issues = validateExportRequest({
        project,
        outputPath: "/path/to/output.mp4"
      });
      expect(issues).toHaveLength(0);
    });

    it("returns issue when media is missing", () => {
      const project = createMockProject({ media: undefined });
      const issues = validateExportRequest({
        project,
        outputPath: "/path/to/output.mp4"
      });
      expect(issues).toContain("Export cannot start without imported media.");
    });

    it("returns issue when output path is missing", () => {
      const project = createMockProject({
        media: createMockMedia(),
        exportSettings: { codec: "h264", quality: "standard", sizeMode: "source", resizePolicy: "fit" }
      });
      const issues = validateExportRequest({
        project,
        outputPath: undefined
      });
      expect(issues).toContain("Export output path is required.");
    });

    it("returns issue for non-MP4 output path", () => {
      const project = createMockProject({
        media: createMockMedia()
      });
      const issues = validateExportRequest({
        project,
        outputPath: "/path/to/output.avi"
      });
      expect(issues).toContain("H.264 export must use an .mp4 output path.");
    });

    it("returns issue when output path equals source path", () => {
      const media = createMockMedia({ sourcePath: "/path/to/media.mp4" });
      const project = createMockProject({ media });
      const issues = validateExportRequest({
        project,
        outputPath: "/path/to/media.mp4"
      });
      expect(issues).toContain("Export output cannot overwrite the source media.");
    });
  });

  describe("planExportGeometry", () => {
    it("returns display dimensions for landscape media", () => {
      const media = createMockMedia({ displayWidth: 1920, displayHeight: 1080 });
      const result = planExportGeometry(media);
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
    });

    it("returns display dimensions for portrait media", () => {
      const media = createMockMedia({ displayWidth: 1080, displayHeight: 1920 });
      const result = planExportGeometry(media);
      expect(result.width).toBe(1080);
      expect(result.height).toBe(1920);
    });

    it("returns display dimensions for rotated media", () => {
      const media = createMockMedia({ displayWidth: 1080, displayHeight: 1920, rotation: 90 });
      const result = planExportGeometry(media);
      expect(result.width).toBe(1080);
      expect(result.height).toBe(1920);
    });

    it("clamps oversized display width", () => {
      const media = createMockMedia({ displayWidth: 7680, displayHeight: 4320 });
      const result = planExportGeometry(media);
      expect(result.width).toBe(3840); // MAX_DISPLAY_WIDTH
    });

    it("clamps oversized display height", () => {
      const media = createMockMedia({ displayWidth: 1920, displayHeight: 4320 });
      const result = planExportGeometry(media);
      expect(result.height).toBe(2160); // MAX_DISPLAY_HEIGHT
    });
  });

  describe("computeExportFps", () => {
    it("returns frame rate and total frames for media with known frame count", () => {
      const media = createMockMedia({ frameRate: 24, totalFrames: 240 });
      const result = computeExportFps(media);
      expect(result.fps).toBe(24);
      expect(result.totalFrames).toBe(240);
    });

    it("clamps frame rate to valid range", () => {
      const media = createMockMedia({ frameRate: 0.5, totalFrames: undefined, durationSeconds: 10 });
      const result = computeExportFps(media);
      expect(result.fps).toBe(1);
    });

    it("clamps high frame rate to 240", () => {
      const media = createMockMedia({ frameRate: 300, totalFrames: undefined, durationSeconds: 10 });
      const result = computeExportFps(media);
      expect(result.fps).toBe(240);
    });

    it("computes total frames from duration when totalFrames is undefined", () => {
      const media = createMockMedia({ frameRate: 30, totalFrames: undefined, durationSeconds: 10 });
      const result = computeExportFps(media);
      expect(result.totalFrames).toBe(300);
    });

    it("returns minimum 1 frame when computation yields 0", () => {
      const media = createMockMedia({ frameRate: 0, totalFrames: undefined, durationSeconds: 0 });
      const result = computeExportFps(media);
      expect(result.totalFrames).toBe(1);
    });
  });

  describe("createExportJobSnapshot", () => {
    it("creates snapshot with correct dimensions for landscape media", () => {
      const project = createMockProject({
        media: createMockMedia({ displayWidth: 1920, displayHeight: 1080 })
      });
      const snapshot = createExportJobSnapshot({
        project,
        outputPath: "/path/to/output.mp4"
      });
      expect(snapshot.width).toBe(1920);
      expect(snapshot.height).toBe(1080);
    });

    it("creates snapshot with correct dimensions for portrait media", () => {
      const project = createMockProject({
        media: createMockMedia({ displayWidth: 1080, displayHeight: 1920 })
      });
      const snapshot = createExportJobSnapshot({
        project,
        outputPath: "/path/to/output.mp4"
      });
      expect(snapshot.width).toBe(1080);
      expect(snapshot.height).toBe(1920);
    });

    it("generates unique export ID", () => {
      const project = createMockProject({
        media: createMockMedia()
      });
      const snapshot1 = createExportJobSnapshot({ project, outputPath: "/path/to/output1.mp4" });
      const snapshot2 = createExportJobSnapshot({ project, outputPath: "/path/to/output2.mp4" });
      expect(snapshot1.id).not.toBe(snapshot2.id);
    });

    it("uses project quality when not overridden", () => {
      const project = createMockProject({
        media: createMockMedia(),
        exportSettings: { codec: "h264", quality: "high", sizeMode: "source", resizePolicy: "fit" }
      });
      const snapshot = createExportJobSnapshot({ project, outputPath: "/path/to/output.mp4" });
      expect(snapshot.quality).toBe("high");
    });

    it("uses request quality when provided", () => {
      const project = createMockProject({
        media: createMockMedia(),
        exportSettings: { codec: "h264", quality: "standard", sizeMode: "source", resizePolicy: "fit" }
      });
      const snapshot = createExportJobSnapshot({
        project,
        outputPath: "/path/to/output.mp4",
        quality: "draft"
      });
      expect(snapshot.quality).toBe("draft");
    });
  });

  describe("computeExportGeometry", () => {
    it("returns source dimensions when sizeMode is source", () => {
      const project = createMockProject({
        media: createMockMedia({ displayWidth: 1920, displayHeight: 1080 }),
        exportSettings: { codec: "h264", quality: "standard", sizeMode: "source", resizePolicy: "fit" }
      });
      const result = computeExportGeometry(project.exportSettings, project.media!);
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
    });

    it("applies fit policy to portrait-9:16 preset from landscape source", () => {
      const project = createMockProject({
        media: createMockMedia({ displayWidth: 1920, displayHeight: 1080 }),
        exportSettings: { codec: "h264", quality: "standard", sizeMode: "preset", preset: "portrait-9:16", resizePolicy: "fit" }
      });
      const result = computeExportGeometry(project.exportSettings, project.media!);
      // landscape source (1.78) taller than portrait target (0.56) -> fit to width, letterbox height
      expect(result.width).toBe(1080);
      expect(result.height).toBe(608);
    });

    it("applies crop policy to portrait-9:16 preset from landscape source", () => {
      const project = createMockProject({
        media: createMockMedia({ displayWidth: 1920, displayHeight: 1080 }),
        exportSettings: { codec: "h264", quality: "standard", sizeMode: "preset", preset: "portrait-9:16", resizePolicy: "crop" }
      });
      const result = computeExportGeometry(project.exportSettings, project.media!);
      // crop: landscape source fills portrait target (extra width is cropped off)
      expect(result.width).toBe(3413);
      expect(result.height).toBe(1920);
    });

    it("applies pad policy to portrait-9:16 preset from landscape source", () => {
      const project = createMockProject({
        media: createMockMedia({ displayWidth: 1920, displayHeight: 1080 }),
        exportSettings: { codec: "h264", quality: "standard", sizeMode: "preset", preset: "portrait-9:16", resizePolicy: "pad" }
      });
      const result = computeExportGeometry(project.exportSettings, project.media!);
      // pad: target raster is returned as-is
      expect(result.width).toBe(1080);
      expect(result.height).toBe(1920);
    });
  });

  describe("validateExportGeometry", () => {
    it("returns no issues for valid custom dimensions", () => {
      const project = createMockProject({
        media: createMockMedia(),
        exportSettings: { codec: "h264", quality: "standard", sizeMode: "custom", customWidth: 1920, customHeight: 1080, resizePolicy: "fit" }
      });
      const issues = validateExportGeometry(project.exportSettings, project.media!);
      expect(issues).toHaveLength(0);
    });

    it("returns issue for custom width exceeding max", () => {
      const project = createMockProject({
        media: createMockMedia(),
        exportSettings: { codec: "h264", quality: "standard", sizeMode: "custom", customWidth: 10000, customHeight: 1080, resizePolicy: "fit" }
      });
      const issues = validateExportGeometry(project.exportSettings, project.media!);
      expect(issues.some((i) => i.includes("width"))).toBe(true);
    });

    it("returns issue for custom height of 0", () => {
      const project = createMockProject({
        media: createMockMedia(),
        exportSettings: { codec: "h264", quality: "standard", sizeMode: "custom", customWidth: 1920, customHeight: 0, resizePolicy: "fit" }
      });
      const issues = validateExportGeometry(project.exportSettings, project.media!);
      expect(issues.some((i) => i.includes("height"))).toBe(true);
    });
  });
});
