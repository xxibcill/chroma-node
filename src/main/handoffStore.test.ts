import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createColorNode } from "../shared/colorEngine";
import { createDefaultProject, serializeProject } from "../shared/project";
import { setCurrentProject } from "./projectFile";
import { exportHandoffPackage, importHandoffPackage } from "./handoffStore";

const electronMock = vi.hoisted(() => ({
  userDataPath: "",
  documentsPath: "",
  savePath: ""
}));

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === "documents") return electronMock.documentsPath;
      return electronMock.userDataPath;
    })
  },
  dialog: {
    showSaveDialog: vi.fn(async () => ({ canceled: false, filePath: electronMock.savePath }))
  }
}));

describe("handoffStore", () => {
  let tempDir: string;
  let projectPath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "chroma-handoff-"));
    projectPath = path.join(tempDir, "project.json");
    electronMock.userDataPath = tempDir;
    electronMock.documentsPath = tempDir;
    electronMock.savePath = path.join(tempDir, "handoff.chromahandoff");

    const project = createDefaultProject();
    project.nodes = [
      {
        ...createColorNode(1),
        name: "Node with /Users/jjae/path"
      }
    ];
    project.annotations = [
      {
        id: "a1",
        frameIndex: 1,
        timecode: "00:00:00:01",
        text: "Check /Users/jjae/clip.mov",
        status: "open",
        createdAt: 1,
        updatedAt: 1
      }
    ];
    await fs.writeFile(projectPath, serializeProject(project), "utf8");
    setCurrentProject(project, projectPath);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("preserves project arrays when exporting a redacted handoff package", async () => {
    const result = await exportHandoffPackage({
      packageMode: "handoff-no-cache",
      packageName: "handoff",
      includeMedia: false,
      includeCache: false,
      includeExports: false,
      includeLogs: false,
      redactPaths: true
    });

    await importHandoffPackage({ packagePath: result.path });
    const raw = JSON.parse(await fs.readFile(projectPath, "utf8")) as { nodes: unknown; annotations: unknown };

    expect(Array.isArray(raw.nodes)).toBe(true);
    expect(Array.isArray(raw.annotations)).toBe(true);
    expect(raw.nodes).toHaveLength(1);
    expect(raw.annotations).toHaveLength(1);
  });
});
