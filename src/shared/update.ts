export const UPDATE_SCHEMA_VERSION = "1.0.0";

export type UpdateChannel = "stable" | "beta" | "internal";
export type UpdateStatus = "idle" | "checking" | "available" | "downloading" | "ready" | "failed";

export interface UpdateCheckResult {
  available: boolean;
  version?: string;
  channel?: UpdateChannel;
  releaseNotes?: string;
  publishedAt?: number;
}

export interface UpdateProgress {
  status: UpdateStatus;
  percent: number;
  bytesDownloaded: number;
  totalBytes: number;
}

export interface ReleaseChannelConfig {
  channel: UpdateChannel;
  label: string;
  description: string;
  checkUrl?: string;
  enabled: boolean;
}

export const DEFAULT_RELEASE_CHANNELS: ReleaseChannelConfig[] = [
  {
    channel: "stable",
    label: "Stable",
    description: "Best for most users. Thoroughly tested.",
    enabled: true
  },
  {
    channel: "beta",
    label: "Beta",
    description: "Early access to new features. May be less stable.",
    enabled: true
  },
  {
    channel: "internal",
    label: "Internal",
    description: "For development and testing only.",
    enabled: true
  }
];

export function isUpdateAvailable(current: string, available: string): boolean {
  const currentParts = current.split(".").map(Number);
  const availableParts = available.split(".").map(Number);

  for (let i = 0; i < Math.max(currentParts.length, availableParts.length); i++) {
    const c = currentParts[i] || 0;
    const a = availableParts[i] || 0;
    if (a > c) return true;
    if (a < c) return false;
  }

  return false;
}

export function getChannelFromVersion(version: string): UpdateChannel {
  if (version.includes("beta")) return "beta";
  if (version.includes("alpha") || version.includes("dev")) return "internal";
  return "stable";
}
