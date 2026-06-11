import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createColorNode } from "../shared/colorEngine";
import { createDefaultProject, serializeProject } from "../shared/project";
import { getCurrentProject, setCurrentProject } from "./projectFile";
import {
  createVersion,
  listVersions,
  setVersionStatus,
  snapshotCurrentToVersion,
  switchVersion
} from "./reviewVersionStore";

vi.mock("electron", () => ({
  dialog: {
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn()
  }
}));

describe("reviewVersionStore", () => {
  let tempDir: string;
  let projectPath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "chroma-review-versions-"));
    projectPath = path.join(tempDir, "project.json");

    const project = createDefaultProject();
    project.nodes = [
      {
        ...createColorNode(1),
        name: "Current Grade",
        primaries: {
          ...createColorNode(1).primaries,
          contrast: 1.25
        }
      }
    ];
    await fs.writeFile(projectPath, serializeProject(project), "utf8");
    setCurrentProject(project, projectPath);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("snapshots the current grade into an existing version without sharing node references", async () => {
    const version = await createVersion({ name: "Client Review", duplicateFromCurrent: false });

    await snapshotCurrentToVersion(version.id);
    const { versions } = await listVersions();
    const updated = versions.find((item) => item.id === version.id);

    expect(updated?.nodes[0].name).toBe("Current Grade");
    expect(updated?.nodes[0].primaries.contrast).toBe(1.25);

    getCurrentProject()!.nodes[0].name = "Edited After Snapshot";
    const refreshed = await listVersions();
    expect(refreshed.versions.find((item) => item.id === version.id)?.nodes[0].name).toBe("Current Grade");

    await switchVersion(version.id);
    expect(getCurrentProject()?.nodes[0].name).toBe("Current Grade");
  });

  it("records status changes in the approval chain", async () => {
    const version = await createVersion({ name: "Approval Candidate", duplicateFromCurrent: true });

    const approved = await setVersionStatus(version.id, "approved", "Maya", "Ready for delivery");

    expect(approved.status).toBe("approved");
    expect(approved.approvalChain).toMatchObject([
      {
        status: "approved",
        reviewerLabel: "Maya",
        comment: "Ready for delivery"
      }
    ]);
  });
});
