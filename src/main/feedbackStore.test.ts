import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultProject, serializeProject } from "../shared/project";
import { setCurrentProject } from "./projectFile";
import { importFeedback, importFeedbackToAnnotations } from "./feedbackStore";

vi.mock("electron", () => ({
  dialog: {
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn()
  }
}));

describe("feedbackStore", () => {
  let tempDir: string;
  let projectPath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "chroma-feedback-"));
    projectPath = path.join(tempDir, "project.json");
    const project = createDefaultProject();
    await fs.writeFile(projectPath, serializeProject(project), "utf8");
    setCurrentProject(project, projectPath);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("imports feedback notes into annotations and reports renamed duplicates", async () => {
    const feedbackPath = path.join(tempDir, "feedback.json");
    await fs.writeFile(feedbackPath, JSON.stringify({
      schemaVersion: "1.0.0",
      projectId: "project",
      versionId: "version-a",
      reviewerLabel: "Client",
      createdAt: 123,
      notes: [
        { id: "note-1", frameIndex: 4, timecode: "00:00:00:04", text: "Lift mids", status: "open" }
      ]
    }), "utf8");

    const feedback = await importFeedback({ feedbackPath });
    const first = await importFeedbackToAnnotations(feedback, "skip");
    const second = await importFeedbackToAnnotations(feedback, "rename");

    expect(first).toMatchObject({ imported: 1, skipped: 0, renamed: 0 });
    expect(second).toMatchObject({ imported: 1, skipped: 0, renamed: 1 });
    expect(second.conflicts).toEqual([
      { feedbackNoteId: "note-1", annotationId: "fb-note-1-2", action: "renamed" }
    ]);
  });
});
