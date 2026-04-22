import { describe, expect, it } from "vitest";
import { createColorNode, invalidateTrackingForWindow } from "./colorEngine";
import { PROJECT_SCHEMA_VERSION, createDefaultProject, serializeProject, validateProject } from "./project";

describe("project schema", () => {
  it("initializes a new project with one neutral node", () => {
    const project = createDefaultProject();
    expect(project.schemaVersion).toBe(PROJECT_SCHEMA_VERSION);
    expect(project.nodes).toHaveLength(1);
    expect(project.nodes[0].primaries.contrast).toBe(1);
  });

  it("limits project node arrays to three serial nodes", () => {
    const project = createDefaultProject();
    const result = validateProject({
      ...project,
      nodes: [createColorNode(1), createColorNode(2), createColorNode(3), createColorNode(4)]
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.nodes).toHaveLength(3);
      expect(result.warnings.some((warning) => warning.code === "TRUNCATED")).toBe(true);
    }
  });

  it("clamps invalid numeric values and reports structured warnings", () => {
    const project = createDefaultProject();
    const result = validateProject({
      ...project,
      playback: {
        currentFrame: -12,
        viewerMode: "graded",
        splitPosition: 8
      },
      nodes: [
        {
          ...project.nodes[0],
          primaries: {
            ...project.nodes[0].primaries,
            contrast: 9,
            tint: -8
          }
        }
      ]
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.playback.splitPosition).toBe(1);
      expect(result.project.nodes[0].primaries.contrast).toBe(2);
      expect(result.project.nodes[0].primaries.tint).toBe(-1);
      expect(result.warnings.every((warning) => typeof warning.path === "string" && typeof warning.message === "string")).toBe(true);
    }
  });

  it("rejects unsupported schema versions with structured errors", () => {
    const result = validateProject({
      ...createDefaultProject(),
      schemaVersion: "9.9.9"
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({ path: "schemaVersion", code: "UNSUPPORTED_VERSION" });
    }
  });

  it("round-trips JSON without embedding media bytes", () => {
    const project = {
      ...createDefaultProject(),
      media: {
        id: "clip",
        sourcePath: "/clips/source.mp4",
        fileName: "source.mp4",
        container: "mov,mp4",
        codec: "h264",
        width: 1920,
        height: 1080,
        durationSeconds: 2,
        frameRate: 24,
        totalFrames: 48,
        hasAudio: false,
        rotation: 0,
        videoStreamIndex: 0
      }
    };
    const json = serializeProject(project);
    const parsed = validateProject(JSON.parse(json));

    expect(json).toContain("/clips/source.mp4");
    expect(json).not.toContain("data:");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.project.media?.sourcePath).toBe("/clips/source.mp4");
    }
  });

  it("round-trips qualifier and power-window state in node JSON", () => {
    const project = createDefaultProject();
    project.nodes[0].qualifier = {
      ...project.nodes[0].qualifier,
      enabled: true,
      hueCenter: 350,
      hueWidth: 30,
      hueSoftness: 12,
      invert: true
    };
    project.nodes[0].windows.ellipse = {
      ...project.nodes[0].windows.ellipse,
      enabled: true,
      centerX: 0.35,
      centerY: 0.4,
      width: 0.42,
      height: 0.28,
      softness: 0.2
    };

    const parsed = validateProject(JSON.parse(serializeProject(project)));

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.project.nodes[0].qualifier.enabled).toBe(true);
      expect(parsed.project.nodes[0].qualifier.hueCenter).toBe(350);
      expect(parsed.project.nodes[0].qualifier.invert).toBe(true);
      expect(parsed.project.nodes[0].windows.ellipse.enabled).toBe(true);
      expect(parsed.project.nodes[0].windows.ellipse.centerX).toBe(0.35);
    }
  });

  it("round-trips tracking keyframes in node JSON", () => {
    const project = createDefaultProject();
    project.media = {
      id: "clip",
      sourcePath: "/clips/source.mp4",
      fileName: "source.mp4",
      container: "mov,mp4",
      codec: "h264",
      width: 1920,
      height: 1080,
      durationSeconds: 2,
      frameRate: 24,
      totalFrames: 48,
      hasAudio: false,
      rotation: 0,
      videoStreamIndex: 0
    };
    project.nodes[0].tracking = {
      targetShape: "rectangle",
      state: "ready",
      keyframes: [
        { frame: 4, dx: 0, dy: 0, confidence: 1 },
        { frame: 5, dx: 0.02, dy: -0.01, confidence: 0.82 }
      ]
    };

    const parsed = validateProject(JSON.parse(serializeProject(project)));

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.project.nodes[0].tracking.targetShape).toBe("rectangle");
      expect(parsed.project.nodes[0].tracking.keyframes).toHaveLength(2);
      expect(parsed.project.nodes[0].tracking.keyframes[1]).toMatchObject({ frame: 5, dx: 0.02, dy: -0.01 });
    }
  });

  it("rejects invalid tracking frame indexes and clamps confidence", () => {
    const project = createDefaultProject();
    const result = validateProject({
      ...project,
      media: {
        id: "clip",
        sourcePath: "/clips/source.mp4",
        fileName: "source.mp4",
        container: "mov,mp4",
        codec: "h264",
        width: 1920,
        height: 1080,
        durationSeconds: 1,
        frameRate: 24,
        totalFrames: 12,
        hasAudio: false,
        rotation: 0,
        videoStreamIndex: 0
      },
      nodes: [
        {
          ...project.nodes[0],
          tracking: {
            targetShape: "ellipse",
            state: "ready",
            keyframes: [
              { frame: -1, dx: 0, dy: 0, confidence: 1 },
              { frame: 12, dx: 0, dy: 0, confidence: 1 },
              { frame: 4, dx: 2, dy: -2, confidence: 4 }
            ]
          }
        }
      ]
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.nodes[0].tracking.keyframes).toEqual([
        { frame: 4, dx: 1, dy: -1, confidence: 1 }
      ]);
      expect(result.warnings.some((warning) => warning.path === "nodes.0.tracking.keyframes")).toBe(true);
    }
  });

  it("marks tracking stale after a manual edit to the tracked window", () => {
    const node = createColorNode(1);
    node.tracking = {
      targetShape: "ellipse",
      state: "ready",
      keyframes: [{ frame: 1, dx: 0.1, dy: 0, confidence: 0.9 }]
    };

    const staleNode = invalidateTrackingForWindow(node, "ellipse");

    expect(staleNode.tracking.state).toBe("stale");
  });
});
