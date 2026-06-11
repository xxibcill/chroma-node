import { app } from "electron";
import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { ONBOARDING_EXPERIMENTS, type OnboardingExperiment } from "../shared/launchConfig.js";

const EXPERIMENT_FILE = "launch-experiments.json";

function getExperimentPath(): string {
  return path.join(app.getPath("userData"), EXPERIMENT_FILE);
}

async function ensureUserDataDir(): Promise<void> {
  const dir = app.getPath("userData");
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

export async function getOnboardingExperiments(): Promise<OnboardingExperiment[]> {
  const overrides = await loadExperimentOverrides();
  return ONBOARDING_EXPERIMENTS.map((experiment) => ({
    ...experiment,
    enabled: overrides[experiment.id] ?? experiment.enabled
  }));
}

export async function setOnboardingExperiment(id: string, enabled: boolean): Promise<void> {
  if (!ONBOARDING_EXPERIMENTS.some((experiment) => experiment.id === id)) {
    throw new Error(`Unknown experiment: ${id}`);
  }

  const overrides = await loadExperimentOverrides();
  overrides[id] = enabled;
  await ensureUserDataDir();
  await writeFile(getExperimentPath(), JSON.stringify(overrides, null, 2), "utf8");
}

async function loadExperimentOverrides(): Promise<Record<string, boolean>> {
  const experimentPath = getExperimentPath();
  if (!existsSync(experimentPath)) {
    return {};
  }

  try {
    const parsed = JSON.parse(await readFile(experimentPath, "utf8")) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean")
    );
  } catch {
    return {};
  }
}
