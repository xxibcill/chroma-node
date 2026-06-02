import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createColorNode } from "../shared/colorEngine";
import { createDefaultProject, serializeProject, type GradeVersion } from "../shared/project";
import { getCurrentProject, setCurrentProject } from "./projectFile";
import { exportReviewPackage, importReviewPackage } from "./reviewPackageStore";

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

describe("reviewPackageStore", () => {
  let tempDir: string;
  let sourcePath: string;
  let targetPath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "chroma-review-package-"));
    sourcePath = path.join(tempDir, "source-project.json");
    targetPath = path.join(tempDir, "target-project.json");
    electronMock.userDataPath = tempDir;
    electronMock.documentsPath = tempDir;
    electronMock.savePath = path.join(tempDir, "review.chromareview");
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("replaces existing versions when duplicateStrategy is replace", async () => {
    const importedNode = {
      ...createColorNode(1),
      name: "Imported Grade",
      primaries: {
        ...createColorNode(1).primaries,
        contrast: 1.4
      }
    };
    const importedVersion: GradeVersion = {
      id: "version-1",
      name: "Imported Version",
      status: "approved",
      createdAt: 1,
      updatedAt: 1,
      sourceRecipe: false,
      nodes: [importedNode],
      stillRefs: [],
      approvalChain: []
    };
    const sourceProject = {
      ...createDefaultProject(),
      gradeVersions: [importedVersion]
    };
    await fs.writeFile(sourcePath, serializeProject(sourceProject), "utf8");
    setCurrentProject(sourceProject, sourcePath);
    const exported = await exportReviewPackage({
      versionIds: ["version-1"],
      stillIds: [],
      scopeSnapshotIds: [],
      packageType: "client-review",
      packageName: "review",
      includeMedia: false,
      redactPaths: false
    });

    const targetVersion: GradeVersion = {
      ...importedVersion,
      name: "Existing Version",
      status: "draft",
      nodes: [createColorNode(1)]
    };
    const targetProject = {
      ...createDefaultProject(),
      gradeVersions: [targetVersion]
    };
    await fs.writeFile(targetPath, serializeProject(targetProject), "utf8");
    setCurrentProject(targetProject, targetPath);

    await importReviewPackage({ packagePath: exported.path, duplicateStrategy: "replace" });

    const version = getCurrentProject()?.gradeVersions?.find((item) => item.id === "version-1");
    expect(version?.name).toBe("Imported Version");
    expect(version?.status).toBe("approved");
    expect(version?.nodes[0].name).toBe("Imported Grade");
  });
});
