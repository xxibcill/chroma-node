import { app } from "electron";
import { existsSync } from "fs";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import type { LearningProgressPayload } from "../shared/ipc.js";
import { createDefaultLearningProgress } from "../shared/learning.js";

const PROGRESS_FILENAME = "learning-progress.json";

function getProgressPath(): string {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, PROGRESS_FILENAME);
}

export async function loadProgress(): Promise<LearningProgressPayload> {
  const progressPath = getProgressPath();

  if (!existsSync(progressPath)) {
    return createDefaultLearningProgress();
  }

  try {
    const data = await readFile(progressPath, "utf8");
    const parsed = JSON.parse(data) as LearningProgressPayload;

    if (!parsed.schemaVersion) {
      return createDefaultLearningProgress();
    }

    return parsed;
  } catch {
    return createDefaultLearningProgress();
  }
}

export async function saveProgress(progress: LearningProgressPayload): Promise<void> {
  const progressPath = getProgressPath();
  const dir = path.dirname(progressPath);

  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  const updated: LearningProgressPayload = {
    ...progress,
    updatedAt: Date.now()
  };

  await writeFile(progressPath, JSON.stringify(updated, null, 2), "utf8");
}

export async function resetProgress(): Promise<void> {
  const defaultProgress = createDefaultLearningProgress();
  await saveProgress(defaultProgress);
}
