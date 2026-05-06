import type { LibraryItem } from "./library.js";

export const PACK_SCHEMA_VERSION = "1.0.0";

export interface PackManifest {
  schemaVersion: typeof PACK_SCHEMA_VERSION;
  packId: string;
  name: string;
  description?: string;
  author?: string;
  authorId?: string;
  version: string;
  createdAt: number;
  updatedAt: number;
  trust: TrustLevel;
  items: PackManifestItem[];
  dependencies?: PackDependency[];
  signature?: string;
  checksum: string;
  license?: PackLicense;
  priceTier?: "free" | "standard" | "premium";
  preview?: PackPreview;
  storeUrl?: string;
  installPath?: string;
}

export type TrustLevel = "first-party" | "verified-creator" | "local";

export interface PackLicense {
  type: "proprietary" | "cc-by" | "cc-by-sa" | "cc0" | "custom";
  text?: string;
  url?: string;
}

export interface PackPreview {
  thumbnailUrl?: string;
  galleryUrls?: string[];
  descriptionHtml?: string;
}

export interface PackManifestItem {
  id: string;
  originalId: string;
  type: LibraryItem["type"];
  name: string;
  version: string;
  dataKind: string;
}

export interface PackDependency {
  packId: string;
  versionMin?: string;
  versionMax?: string;
}

export type PackDuplicateStrategy = "skip" | "replace" | "rename";

export interface PackImportOptions {
  duplicateStrategy: PackDuplicateStrategy;
  trustOverride?: TrustLevel;
}

export interface PackExportOptions {
  includeThumbnails?: boolean;
  includeSourceReferences?: boolean;
}

export interface PackImportResult {
  imported: LibraryItem[];
  skipped: { item: PackManifestItem; reason: string }[];
  replaced: LibraryItem[];
  errors: { item: PackManifestItem; error: string }[];
}

export interface InstalledPackInfo {
  packId: string;
  manifest: PackManifest;
  installPath: string;
  installedAt: number;
  lastUpdated?: number;
}

export interface PackUpdateInfo {
  packId: string;
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
}

export function createInstalledPackInfo(manifest: PackManifest, installPath: string): InstalledPackInfo {
  return {
    packId: manifest.packId,
    manifest,
    installPath,
    installedAt: Date.now()
  };
}

export function computePackChecksum(manifest: PackManifest, _content: string): string {
  const data = JSON.stringify({ manifest, content: _content.slice(0, 1000) });
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const positive = Math.abs(hash);
  return positive.toString(16).padStart(8, "0");
}

export function validatePackManifest(input: unknown): { ok: true; manifest: PackManifest } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Pack manifest must be an object" };
  }

  const manifest = input as Record<string, unknown>;

  if (typeof manifest.schemaVersion !== "string") {
    return { ok: false, error: "schemaVersion is required" };
  }

  if (manifest.schemaVersion !== PACK_SCHEMA_VERSION) {
    return { ok: false, error: `Unsupported pack schema version: ${manifest.schemaVersion}` };
  }

  if (typeof manifest.packId !== "string" || !manifest.packId) {
    return { ok: false, error: "packId is required" };
  }

  if (typeof manifest.name !== "string" || !manifest.name) {
    return { ok: false, error: "Pack name is required" };
  }

  if (typeof manifest.checksum !== "string" || !manifest.checksum) {
    return { ok: false, error: "Checksum is required" };
  }

  if (!Array.isArray(manifest.items)) {
    return { ok: false, error: "Items array is required" };
  }

  return { ok: true, manifest: manifest as unknown as PackManifest };
}

export function createPackFromItems(
  items: LibraryItem[],
  name: string,
  description?: string,
  author?: string
): { manifest: PackManifest; content: string } {
  const packId = `pack-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const manifestItems: PackManifestItem[] = items.map(item => ({
    id: item.id,
    originalId: item.id,
    type: item.type,
    name: item.name,
    version: item.version,
    dataKind: item.data.kind
  }));

  const manifest: PackManifest = {
    schemaVersion: PACK_SCHEMA_VERSION,
    packId,
    name,
    description,
    author,
    version: "1.0.0",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    trust: "local",
    items: manifestItems,
    checksum: ""
  };

  const content = JSON.stringify({ items }, null, 2);
  manifest.checksum = computePackChecksum(manifest, content);

  return { manifest, content };
}

export function parsePackContent(
  manifest: PackManifest,
  content: string,
  validateChecksum = true
): { ok: true; items: LibraryItem[] } | { ok: false; error: string } {
  if (validateChecksum) {
    const expectedChecksum = manifest.checksum;
    const computed = computePackChecksum({ ...manifest, checksum: "" }, content);
    if (expectedChecksum !== computed) {
      return { ok: false, error: "Pack content checksum mismatch - possible tampering detected" };
    }
  }

  let parsed: { items: LibraryItem[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    return { ok: false, error: "Pack content is not valid JSON" };
  }

  if (!Array.isArray(parsed.items)) {
    return { ok: false, error: "Pack content must contain an items array" };
  }

  return { ok: true, items: parsed.items };
}