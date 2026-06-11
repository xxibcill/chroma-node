import { describe, expect, it, vi } from "vitest";
import { createDefaultProject } from "../shared/project";
import { createVersion } from "./reviewVersionStore";
import { getCurrentProject, syncCurrentProject } from "./projectFile";

vi.mock("electron", () => ({
  dialog: {
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn()
  }
}));

describe("review stores with unsaved projects", () => {
  it("keeps review changes in memory when no project path is set", async () => {
    const project = createDefaultProject();
    project.nodes[0].name = "Unsaved Grade";

    syncCurrentProject(project, "");
    const version = await createVersion({ name: "Client Review", duplicateFromCurrent: true });

    expect(version.nodes[0].name).toBe("Unsaved Grade");
    expect(getCurrentProject()?.gradeVersions?.[0]?.id).toBe(version.id);
  });
});
