import type { ColorNode } from "./colorEngine.js";

export const LIBRARY_SCHEMA_VERSION = "1.0.0";

export type LibraryItemType = "look" | "lut" | "recipe" | "still" | "sample-project" | "lesson-pack";

export type TrustLevel = "first-party" | "verified-creator" | "local";

export interface LibraryItemThumbnail {
  dataUrl?: string;
  width?: number;
  height?: number;
}

export interface LibraryItemSource {
  projectId?: string;
  projectName?: string;
  nodeIndex?: number;
  frameTime?: number;
}

export interface LibraryItemCompatibility {
  appVersionMin?: string;
  appVersionMax?: string;
  schemaVersionMin?: string;
  schemaVersionMax?: string;
  colorProfiles: string[];
  lutFormats?: string[];
}

export interface LibraryItem {
  id: string;
  type: LibraryItemType;
  name: string;
  description?: string;
  version: string;
  createdAt: number;
  updatedAt: number;
  author?: string;
  authorId?: string;
  tags: string[];
  thumbnail?: LibraryItemThumbnail;
  favorite: boolean;
  compatibility: LibraryItemCompatibility;
  trust: TrustLevel;
  source?: LibraryItemSource;
  data: LookData | LutData | RecipeData | StillData | SampleProjectData | LessonPackData;
  metadata?: Record<string, unknown>;
}

export interface LookData {
  kind: "look";
  nodes: ColorNode[];
  compatibleProfiles: string[];
}

export interface LutData {
  kind: "lut";
  lutType: "creative" | "technical";
  cubeContent?: string;
  size?: number;
  fileName?: string;
}

export interface RecipeData {
  kind: "recipe";
  nodes: ColorNode[];
  compatibleProfiles: string[];
  tags: string[];
}

export interface StillData {
  kind: "still";
  imageData: string;
  width: number;
  height: number;
  sourceMediaId?: string;
}

export interface SampleProjectData {
  kind: "sample-project";
  projectJson: string;
  mediaPaths: string[];
}

export interface LessonPackData {
  kind: "lesson-pack";
  lessonIds: string[];
  customLessons?: unknown[];
}

export interface LibraryValidationIssue {
  path: string;
  code: "INVALID_TYPE" | "MISSING_REQUIRED" | "INVALID_DATA";
  message: string;
}

export type LibraryValidationResult =
  | { ok: true; item: LibraryItem }
  | { ok: false; errors: LibraryValidationIssue[] };

export const VALID_COLOR_PROFILES = [
  "rec709", "rec2020", "srgb", "p3", "appleLog", "hlg", "pq", "linear"
] as const;

export type ValidColorProfile = typeof VALID_COLOR_PROFILES[number];

export const VALID_LUT_FORMATS = ["cube", "3dl", "mga"] as const;

export type ValidLutFormat = typeof VALID_LUT_FORMATS[number];

export function createLibraryItemId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && "randomUUID" in cryptoApi) {
    return cryptoApi.randomUUID();
  }
  return `lib-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function validateLibraryItem(input: unknown): LibraryValidationResult {
  if (!isRecord(input)) {
    return { ok: false, errors: [{ path: "", code: "INVALID_TYPE", message: "Library item must be an object" }] };
  }

  const errors: LibraryValidationIssue[] = [];

  const id = readString(input.id, "id", "", errors);
  if (!id) {
    errors.push({ path: "id", code: "MISSING_REQUIRED", message: "Item ID is required" });
  }

  const type = readItemType(input.type, errors);
  const name = readString(input.name, "name", "Untitled", errors);
  if (!name) {
    errors.push({ path: "name", code: "MISSING_REQUIRED", message: "Item name is required" });
  }

  const version = readString(input.version, "version", LIBRARY_SCHEMA_VERSION, errors);
  const trust = readTrustLevel(input.trust, errors);
  const compatibility = readCompatibility(input.compatibility);
  const data = readItemData(input.data, type, errors);
  const tags = readTags(input.tags);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const validatedId = id || createLibraryItemId();
  const validatedName = name || "Untitled";

  return {
    ok: true,
    item: {
      id: validatedId,
      type: type!,
      name: validatedName,
      description: input.description as string | undefined,
      version: version!,
      createdAt: typeof input.createdAt === "number" ? input.createdAt : Date.now(),
      updatedAt: typeof input.updatedAt === "number" ? input.updatedAt : Date.now(),
      author: input.author as string | undefined,
      authorId: input.authorId as string | undefined,
      tags: tags!,
      thumbnail: readThumbnail(input.thumbnail),
      favorite: input.favorite === true,
      compatibility: compatibility!,
      trust: trust!,
      source: input.source as LibraryItemSource | undefined,
      data: data!,
      metadata: input.metadata as Record<string, unknown> | undefined
    }
  };
}

function readItemType(input: unknown, errors: LibraryValidationIssue[]): LibraryItemType | undefined {
  const validTypes: LibraryItemType[] = ["look", "lut", "recipe", "still", "sample-project", "lesson-pack"];
  if (validTypes.includes(input as LibraryItemType)) {
    return input as LibraryItemType;
  }
  errors.push({ path: "type", code: "INVALID_TYPE", message: `Invalid item type: ${String(input)}` });
  return undefined;
}

function readTrustLevel(input: unknown, errors: LibraryValidationIssue[]): TrustLevel | undefined {
  const validLevels: TrustLevel[] = ["first-party", "verified-creator", "local"];
  if (validLevels.includes(input as TrustLevel)) {
    return input as TrustLevel;
  }
  if (input !== undefined) {
    errors.push({ path: "trust", code: "INVALID_TYPE", message: `Invalid trust level: ${String(input)}` });
  }
  return "local";
}

function readCompatibility(input: unknown): LibraryItemCompatibility {
  if (!isRecord(input)) {
    return { colorProfiles: [] };
  }

  const profiles: string[] = [];
  if (Array.isArray(input.colorProfiles)) {
    for (const p of input.colorProfiles) {
      if (typeof p === "string" && VALID_COLOR_PROFILES.includes(p as ValidColorProfile)) {
        profiles.push(p);
      }
    }
  }

  return {
    appVersionMin: typeof input.appVersionMin === "string" ? input.appVersionMin : undefined,
    appVersionMax: typeof input.appVersionMax === "string" ? input.appVersionMax : undefined,
    schemaVersionMin: typeof input.schemaVersionMin === "string" ? input.schemaVersionMin : undefined,
    schemaVersionMax: typeof input.schemaVersionMax === "string" ? input.schemaVersionMax : undefined,
    colorProfiles: profiles,
    lutFormats: Array.isArray(input.lutFormats) ? input.lutFormats.filter((f): f is string =>
      VALID_LUT_FORMATS.includes(f as ValidLutFormat)) : undefined
  };
}

function readItemData(input: unknown, type: LibraryItemType | undefined, errors: LibraryValidationIssue[]): LookData | LutData | RecipeData | StillData | SampleProjectData | LessonPackData | undefined {
  if (!isRecord(input)) {
    if (type) {
      errors.push({ path: "data", code: "MISSING_REQUIRED", message: `Data is required for ${type} items` });
    }
    return undefined;
  }

  const kind = input.kind;
  if (typeof kind !== "string") {
    errors.push({ path: "data.kind", code: "MISSING_REQUIRED", message: "Data kind is required" });
    return undefined;
  }

  switch (kind) {
    case "look":
    case "recipe":
      return readLookOrRecipeData(input, kind, errors);
    case "lut":
      return readLutData(input);
    case "still":
      return readStillData(input, errors);
    case "sample-project":
      return readSampleProjectData(input, errors);
    case "lesson-pack":
      return readLessonPackData(input);
    default:
      errors.push({ path: "data.kind", code: "INVALID_TYPE", message: `Unknown data kind: ${kind}` });
      return undefined;
  }
}

function readLookOrRecipeData(input: Record<string, unknown>, kind: "look" | "recipe", errors: LibraryValidationIssue[]): LookData | RecipeData | undefined {
  if (!Array.isArray(input.nodes)) {
    errors.push({ path: "data.nodes", code: "MISSING_REQUIRED", message: "Nodes array is required" });
    return undefined;
  }

  const compatibleProfiles: string[] = [];
  if (Array.isArray(input.compatibleProfiles)) {
    for (const p of input.compatibleProfiles) {
      if (typeof p === "string" && VALID_COLOR_PROFILES.includes(p as ValidColorProfile)) {
        compatibleProfiles.push(p);
      }
    }
  }

  if (kind === "recipe") {
    const tags: string[] = [];
    if (Array.isArray(input.tags)) {
      for (const t of input.tags) {
        if (typeof t === "string") tags.push(t);
      }
    }
    return { kind: "recipe", nodes: input.nodes as ColorNode[], compatibleProfiles, tags };
  }

  return { kind: "look", nodes: input.nodes as ColorNode[], compatibleProfiles };
}

function readLutData(input: Record<string, unknown>): LutData | undefined {
  const lutType = input.lutType === "creative" || input.lutType === "technical" ? input.lutType : "creative";
  return {
    kind: "lut",
    lutType,
    cubeContent: typeof input.cubeContent === "string" ? input.cubeContent : undefined,
    size: typeof input.size === "number" ? input.size : undefined,
    fileName: typeof input.fileName === "string" ? input.fileName : undefined
  };
}

function readStillData(input: Record<string, unknown>, errors: LibraryValidationIssue[]): StillData | undefined {
  const width = typeof input.width === "number" ? input.width : 0;
  const height = typeof input.height === "number" ? input.height : 0;

  if (!width || !height) {
    errors.push({ path: "data.width/height", code: "MISSING_REQUIRED", message: "Still width and height are required" });
    return undefined;
  }

  return {
    kind: "still",
    imageData: typeof input.imageData === "string" ? input.imageData : "",
    width,
    height,
    sourceMediaId: input.sourceMediaId as string | undefined
  };
}

function readSampleProjectData(input: Record<string, unknown>, errors: LibraryValidationIssue[]): SampleProjectData | undefined {
  if (typeof input.projectJson !== "string") {
    errors.push({ path: "data.projectJson", code: "MISSING_REQUIRED", message: "Project JSON is required" });
    return undefined;
  }

  return {
    kind: "sample-project",
    projectJson: input.projectJson,
    mediaPaths: Array.isArray(input.mediaPaths) ? input.mediaPaths.filter((p): p is string => typeof p === "string") : []
  };
}

function readLessonPackData(input: Record<string, unknown>): LessonPackData | undefined {
  const lessonIds: string[] = [];
  if (Array.isArray(input.lessonIds)) {
    for (const id of input.lessonIds) {
      if (typeof id === "string") lessonIds.push(id);
    }
  }

  return {
    kind: "lesson-pack",
    lessonIds,
    customLessons: input.customLessons as unknown[] | undefined
  };
}

function readTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((t): t is string => typeof t === "string").slice(0, 20);
}

function readThumbnail(input: unknown): LibraryItemThumbnail | undefined {
  if (!isRecord(input)) return undefined;
  return {
    dataUrl: typeof input.dataUrl === "string" ? input.dataUrl : undefined,
    width: typeof input.width === "number" ? input.width : undefined,
    height: typeof input.height === "number" ? input.height : undefined
  };
}

function readString(value: unknown, path: string, fallback: string, errors: LibraryValidationIssue[]): string | undefined {
  if (typeof value === "string") return value;
  if (value !== undefined) {
    errors.push({ path, code: "INVALID_TYPE", message: `Expected string, got ${typeof value}` });
  }
  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function filterLibraryItems(
  items: LibraryItem[],
  filters: {
    type?: LibraryItemType;
    search?: string;
    tags?: string[];
    favoritesOnly?: boolean;
    compatibleProfile?: string;
  }
): LibraryItem[] {
  return items.filter(item => {
    if (filters.type && item.type !== filters.type) return false;

    if (filters.favoritesOnly && !item.favorite) return false;

    if (filters.compatibleProfile) {
      if (!item.compatibility.colorProfiles.includes(filters.compatibleProfile) &&
          item.compatibility.colorProfiles.length > 0) {
        return false;
      }
    }

    if (filters.tags && filters.tags.length > 0) {
      const hasAllTags = filters.tags.every(tag => item.tags.includes(tag));
      if (!hasAllTags) return false;
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesName = item.name.toLowerCase().includes(searchLower);
      const matchesDesc = item.description?.toLowerCase().includes(searchLower) ?? false;
      const matchesTags = item.tags.some(tag => tag.toLowerCase().includes(searchLower));
      if (!matchesName && !matchesDesc && !matchesTags) return false;
    }

    return true;
  });
}

export function sortLibraryItems(
  items: LibraryItem[],
  sortBy: "name" | "createdAt" | "updatedAt" = "updatedAt",
  ascending = false
): LibraryItem[] {
  const sorted = [...items].sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "createdAt":
        cmp = a.createdAt - b.createdAt;
        break;
      case "updatedAt":
        cmp = a.updatedAt - b.updatedAt;
        break;
    }
    return ascending ? cmp : -cmp;
  });
  return sorted;
}

export function getAllTags(items: LibraryItem[]): string[] {
  const tagSet = new Set<string>();
  for (const item of items) {
    for (const tag of item.tags) {
      tagSet.add(tag);
    }
  }
  return Array.from(tagSet).sort();
}