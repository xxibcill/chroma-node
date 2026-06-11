import { existsSync } from "node:fs";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { dialog } from "electron";
import type { OpenProjectResult, SaveProjectRequest, SaveProjectResult } from "../shared/ipc.js";
import { sanitizeProject, serializeProject, validateProject, type ChromaProject } from "../shared/project.js";
import { appError } from "./errors.js";

let currentProject: ChromaProject | null = null;
let currentProjectPath: string | null = null;

export function getCurrentProject(): ChromaProject | null {
  return currentProject;
}

export function setCurrentProject(project: ChromaProject, projectPath: string): void {
  currentProject = project;
  currentProjectPath = projectPath;
}

export function syncCurrentProject(project: ChromaProject, projectPath?: string): ChromaProject {
  const sanitizedProject = sanitizeProject(project);
  currentProject = sanitizedProject;
  if (projectPath !== undefined) {
    currentProjectPath = projectPath;
  }
  return sanitizedProject;
}

export async function updateProject(project: ChromaProject): Promise<void> {
  const validation = validateProject(project);
  if (!validation.ok) {
    throw appError(
      "PROJECT_VALIDATION_FAILED",
      "Project could not be updated because it failed validation.",
      validation.errors.map((error) => `${error.path}: ${error.message}`).join("\n")
    );
  }

  currentProject = validation.project;
  if (!currentProjectPath) {
    return;
  }

  const tempPath = `${currentProjectPath}.tmp-${process.pid}-${Date.now()}`;
  try {
    await writeFile(tempPath, serializeProject(validation.project), "utf8");
    await rename(tempPath, currentProjectPath);
  } catch (error) {
    throw appError("PROJECT_SAVE_FAILED", "Project could not be updated.", String(error));
  }
}

export function getCurrentProjectPath(): string | null {
  return currentProjectPath;
}

export async function saveProjectFile(request: SaveProjectRequest): Promise<SaveProjectResult> {
  const validation = validateProject(request.project);
  if (!validation.ok) {
    throw appError(
      "PROJECT_VALIDATION_FAILED",
      "Project could not be saved because it failed validation.",
      validation.errors.map((error) => `${error.path}: ${error.message}`).join("\n")
    );
  }

  const projectPath = request.projectPath ?? await selectSavePath(validation.project.name);
  const tempPath = `${projectPath}.tmp-${process.pid}-${Date.now()}`;

  try {
    await writeFile(tempPath, serializeProject(validation.project), "utf8");
    await rename(tempPath, projectPath);
    setCurrentProject(validation.project, projectPath);
    return { projectPath };
  } catch (error) {
    throw appError("PROJECT_SAVE_FAILED", "Project file could not be saved.", String(error));
  }
}

export async function openProjectFile(): Promise<OpenProjectResult> {
  const selection = await dialog.showOpenDialog({
    title: "Open project",
    properties: ["openFile"],
    filters: [
      { name: "Chroma Node Project", extensions: ["json"] },
      { name: "All Files", extensions: ["*"] }
    ]
  });

  if (selection.canceled || !selection.filePaths[0]) {
    throw appError("USER_CANCELLED", "No project file was selected.");
  }

  const projectPath = selection.filePaths[0];
  let parsed: unknown;

  try {
    parsed = JSON.parse(await readFile(projectPath, "utf8"));
  } catch (error) {
    throw appError("PROJECT_OPEN_FAILED", "Project file could not be read as JSON.", String(error));
  }

  const validation = validateProject(parsed);
  if (!validation.ok) {
    throw appError(
      "PROJECT_VALIDATION_FAILED",
      "Project file is not a supported Chroma Node project.",
      validation.errors.map((error) => `${error.path}: ${error.message}`).join("\n")
    );
  }

  const result: OpenProjectResult = {
    project: validation.project,
    projectPath,
    missingMedia: Boolean(validation.project.media && !existsSync(validation.project.media.sourcePath)),
    missingMediaPath: validation.project.media && !existsSync(validation.project.media.sourcePath)
      ? validation.project.media.sourcePath
      : undefined
  };
  setCurrentProject(validation.project, projectPath);
  return result;
}

async function selectSavePath(projectName: string): Promise<string> {
  const selection = await dialog.showSaveDialog({
    title: "Save project",
    defaultPath: `${safeFileName(projectName)}.json`,
    filters: [
      { name: "Chroma Node Project", extensions: ["json"] },
      { name: "All Files", extensions: ["*"] }
    ]
  });

  if (selection.canceled || !selection.filePath) {
    throw appError("USER_CANCELLED", "Project save was cancelled.");
  }

  return selection.filePath;
}

function safeFileName(name: string): string {
  const sanitized = [...name]
    .map((character) => (isUnsafeFileNameCharacter(character) ? "-" : character))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return path.basename(sanitized || "chroma-node-project");
}

function isUnsafeFileNameCharacter(character: string): boolean {
  return character.charCodeAt(0) < 32 || /[<>:"/\\|?*]/.test(character);
}
