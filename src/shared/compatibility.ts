import type { LibraryItem, LibraryItemCompatibility } from "./library.js";
import { LIBRARY_SCHEMA_VERSION } from "./library.js";

export const APP_VERSION = "1.0.0";

export interface CompatibilityIssue {
  code: "APP_VERSION_MISMATCH" | "SCHEMA_MISMATCH" | "COLOR_PROFILE_MISMATCH" | "LUT_FORMAT_UNSUPPORTED" | "MISSING_DEPENDENCY";
  severity: "error" | "warning";
  message: string;
  details?: string;
}

export interface CompatibilityResult {
  compatible: boolean;
  issues: CompatibilityIssue[];
  canApply: boolean;
  requiresWarning: boolean;
}

export function checkLibraryItemCompatibility(
  item: LibraryItem,
  currentAppVersion: string = APP_VERSION,
  currentColorProfile?: string
): CompatibilityResult {
  const issues: CompatibilityIssue[] = [];

  // Check app version compatibility
  if (item.compatibility.appVersionMin) {
    if (compareVersions(currentAppVersion, item.compatibility.appVersionMin) < 0) {
      issues.push({
        code: "APP_VERSION_MISMATCH",
        severity: "error",
        message: `Item requires app version ${item.compatibility.appVersionMin} or higher`,
        details: `Current version: ${currentAppVersion}`
      });
    }
  }

  if (item.compatibility.appVersionMax) {
    if (compareVersions(currentAppVersion, item.compatibility.appVersionMax) > 0) {
      issues.push({
        code: "APP_VERSION_MISMATCH",
        severity: "warning",
        message: `Item was designed for app version ${item.compatibility.appVersionMax} or lower`,
        details: `Current version: ${currentAppVersion}`
      });
    }
  }

  // Check schema version compatibility
  if (item.compatibility.schemaVersionMin) {
    if (compareVersions(LIBRARY_SCHEMA_VERSION, item.compatibility.schemaVersionMin) < 0) {
      issues.push({
        code: "SCHEMA_MISMATCH",
        severity: "error",
        message: `Item requires library schema ${item.compatibility.schemaVersionMin} or higher`
      });
    }
  }

  // Check color profile compatibility
  if (currentColorProfile && item.compatibility.colorProfiles.length > 0) {
    if (!item.compatibility.colorProfiles.includes(currentColorProfile)) {
      issues.push({
        code: "COLOR_PROFILE_MISMATCH",
        severity: "warning",
        message: `Item may not be fully compatible with ${currentColorProfile} color profile`,
        details: `Item compatible profiles: ${item.compatibility.colorProfiles.join(", ")}`
      });
    }
  }

  const hasErrors = issues.some(i => i.severity === "error");
  const hasWarnings = issues.some(i => i.severity === "warning");

  return {
    compatible: !hasErrors,
    issues,
    canApply: !hasErrors,
    requiresWarning: hasWarnings
  };
}

export function checkMultipleItemsCompatibility(
  items: LibraryItem[],
  currentAppVersion: string = APP_VERSION,
  currentColorProfile?: string
): Map<string, CompatibilityResult> {
  const results = new Map<string, CompatibilityResult>();

  for (const item of items) {
    results.set(item.id, checkLibraryItemCompatibility(item, currentAppVersion, currentColorProfile));
  }

  return results;
}

export function migrateLibraryItem(
  item: LibraryItem
): { item: LibraryItem; migrated: boolean; issues: string[] } {
  const issues: string[] = [];
  let migrated = false;
  let result = { ...item };

  // Schema migration for items from older versions
  if (compareVersions(item.version, LIBRARY_SCHEMA_VERSION) < 0) {
    result = {
      ...result,
      version: LIBRARY_SCHEMA_VERSION,
      updatedAt: Date.now()
    };
    migrated = true;
    issues.push(`Migrated from schema ${item.version} to ${LIBRARY_SCHEMA_VERSION}`);
  }

  return { item: result, migrated, issues };
}

export function getCompatibleItems(
  items: LibraryItem[],
  currentAppVersion: string = APP_VERSION,
  currentColorProfile?: string
): { compatible: LibraryItem[]; incompatible: { item: LibraryItem; issues: CompatibilityIssue[] }[] } {
  const compatible: LibraryItem[] = [];
  const incompatible: { item: LibraryItem; issues: CompatibilityIssue[] }[] = [];

  for (const item of items) {
    const result = checkLibraryItemCompatibility(item, currentAppVersion, currentColorProfile);
    if (result.canApply) {
      compatible.push(item);
    } else {
      incompatible.push({ item, issues: result.issues });
    }
  }

  return { compatible, incompatible };
}

function compareVersions(a: string, b: string): number {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const partA = partsA[i] ?? 0;
    const partB = partsB[i] ?? 0;
    if (partA > partB) return 1;
    if (partA < partB) return -1;
  }
  return 0;
}

export function createCompatibilityMetadata(
  appVersionMin?: string,
  appVersionMax?: string,
  schemaVersionMin?: string,
  schemaVersionMax?: string,
  colorProfiles: string[] = [],
  lutFormats?: string[]
): LibraryItemCompatibility {
  return {
    appVersionMin,
    appVersionMax,
    schemaVersionMin: schemaVersionMin ?? LIBRARY_SCHEMA_VERSION,
    schemaVersionMax,
    colorProfiles,
    lutFormats
  };
}