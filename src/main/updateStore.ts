import { app } from "electron";
import { existsSync } from "fs";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import {
  type UpdateChannel,
  type UpdateStatus,
  type UpdateCheckResult,
  type UpdateProgress,
  type ReleaseChannelConfig,
  DEFAULT_RELEASE_CHANNELS,
  isUpdateAvailable
} from "../shared/update.js";

const UPDATE_CONFIG_FILE = "update-config.json";

let updateStatus: UpdateStatus = "idle";
let updateProgress: UpdateProgress = {
  status: "idle",
  percent: 0,
  bytesDownloaded: 0,
  totalBytes: 0
};
let lastCheckResult: UpdateCheckResult = { available: false };

function getUserDataPath(): string {
  return app.getPath("userData");
}

function getUpdateConfigPath(): string {
  return path.join(getUserDataPath(), UPDATE_CONFIG_FILE);
}

async function ensureDir(): Promise<void> {
  const dir = getUserDataPath();
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

export interface UpdateStoreConfig {
  currentVersion: string;
  channel: UpdateChannel;
  channels: ReleaseChannelConfig[];
  autoCheck: boolean;
  checkIntervalMs: number;
  lastCheckAt?: number;
}

const DEFAULT_CONFIG: UpdateStoreConfig = {
  currentVersion: "0.0.0",
  channel: "stable",
  channels: DEFAULT_RELEASE_CHANNELS,
  autoCheck: true,
  checkIntervalMs: 3600000 // 1 hour
};

export async function loadUpdateConfig(): Promise<UpdateStoreConfig> {
  const configPath = getUpdateConfigPath();
  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG, currentVersion: app.getVersion() };
  }

  try {
    const data = await readFile(configPath, "utf8");
    const parsed = JSON.parse(data);
    return {
      currentVersion: parsed.currentVersion || app.getVersion(),
      channel: parsed.channel || "stable",
      channels: Array.isArray(parsed.channels) ? parsed.channels : DEFAULT_RELEASE_CHANNELS,
      autoCheck: parsed.autoCheck ?? true,
      checkIntervalMs: parsed.checkIntervalMs || 3600000,
      lastCheckAt: parsed.lastCheckAt
    };
  } catch {
    return { ...DEFAULT_CONFIG, currentVersion: app.getVersion() };
  }
}

export async function saveUpdateConfig(config: UpdateStoreConfig): Promise<void> {
  await ensureDir();
  const configPath = getUpdateConfigPath();
  await writeFile(configPath, JSON.stringify(config, null, 2), "utf8");
}

export async function setUpdateChannel(channel: UpdateChannel): Promise<void> {
  const config = await loadUpdateConfig();
  config.channel = channel;
  await saveUpdateConfig(config);
}

export async function getUpdateChannel(): Promise<UpdateChannel> {
  const config = await loadUpdateConfig();
  return config.channel;
}

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  updateStatus = "checking";
  updateProgress = { status: "checking", percent: 0, bytesDownloaded: 0, totalBytes: 0 };

  const config = await loadUpdateConfig();
  config.lastCheckAt = Date.now();
  await saveUpdateConfig(config);

  const channel = config.channels.find((item) => item.channel === config.channel);
  if (!channel?.enabled) {
    updateStatus = "failed";
    updateProgress = { status: "failed", percent: 0, bytesDownloaded: 0, totalBytes: 0 };
    lastCheckResult = { available: false, version: config.currentVersion, channel: config.channel };
    return lastCheckResult;
  }

  if (!channel.checkUrl) {
    updateStatus = "idle";
    updateProgress = { status: "idle", percent: 0, bytesDownloaded: 0, totalBytes: 0 };
    lastCheckResult = { available: false, version: config.currentVersion, channel: config.channel };
    return lastCheckResult;
  }

  try {
    const metadata = await fetchUpdateMetadata(channel.checkUrl);
    const available = isUpdateAvailable(config.currentVersion, metadata.version);
    lastCheckResult = {
      available,
      version: metadata.version,
      channel: metadata.channel ?? config.channel,
      releaseNotes: metadata.releaseNotes,
      publishedAt: metadata.publishedAt
    };

    updateStatus = available ? "available" : "idle";
    updateProgress = { status: updateStatus, percent: available ? 100 : 0, bytesDownloaded: 0, totalBytes: 0 };
  } catch {
    updateStatus = "failed";
    updateProgress = { status: "failed", percent: 0, bytesDownloaded: 0, totalBytes: 0 };
    lastCheckResult = { available: false, version: config.currentVersion, channel: config.channel };
  }

  return lastCheckResult;
}

async function fetchUpdateMetadata(checkUrl: string): Promise<Required<Pick<UpdateCheckResult, "version">> & Omit<UpdateCheckResult, "available">> {
  const response = await fetch(checkUrl, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) {
    throw new Error(`Update metadata returned ${response.status}`);
  }

  const parsed = await response.json() as unknown;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Update metadata must be an object");
  }

  const metadata = parsed as Record<string, unknown>;
  if (typeof metadata.version !== "string" || !metadata.version.trim()) {
    throw new Error("Update metadata is missing a version");
  }

  return {
    version: metadata.version,
    channel: isUpdateChannel(metadata.channel) ? metadata.channel : undefined,
    releaseNotes: typeof metadata.releaseNotes === "string" ? metadata.releaseNotes : undefined,
    publishedAt: typeof metadata.publishedAt === "number" ? metadata.publishedAt : undefined
  };
}

function isUpdateChannel(value: unknown): value is UpdateChannel {
  return value === "stable" || value === "beta" || value === "internal";
}

export function getUpdateStatus(): UpdateStatus {
  return updateStatus;
}

export function getUpdateProgress(): UpdateProgress {
  return { ...updateProgress };
}

export function getLastCheckResult(): UpdateCheckResult {
  return { ...lastCheckResult };
}

export async function setAutoCheck(autoCheck: boolean): Promise<void> {
  const config = await loadUpdateConfig();
  config.autoCheck = autoCheck;
  await saveUpdateConfig(config);
}

export async function getAutoCheck(): Promise<boolean> {
  const config = await loadUpdateConfig();
  return config.autoCheck;
}

export async function getAvailableChannels(): Promise<ReleaseChannelConfig[]> {
  const config = await loadUpdateConfig();
  return config.channels;
}

export async function isChannelEnabled(channel: UpdateChannel): Promise<boolean> {
  const config = await loadUpdateConfig();
  const channelConfig = config.channels.find(c => c.channel === channel);
  return channelConfig?.enabled ?? false;
}
