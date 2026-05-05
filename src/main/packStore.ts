import { app, dialog } from "electron";
import { existsSync } from "fs";
import { copyFile, readFile, writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { createLibraryItemId, validateLibraryItem, type LibraryItem } from "../shared/library.js";
import {
  createPackFromItems,
  parsePackContent,
  validatePackManifest,
  type PackImportOptions,
  type PackImportResult,
  type PackManifestItem,
  type PackManifest
} from "../shared/pack.js";
import { loadLibrary, saveLibrary } from "./libraryStore.js";

function getPackDir(): string {
  return path.join(app.getPath("userData"), "packs");
}

function ensurePackDir(): Promise<void> {
  const dir = getPackDir();
  if (!existsSync(dir)) {
    return mkdir(dir, { recursive: true }).then(() => undefined);
  }
  return Promise.resolve();
}

export async function exportPack(
  items: LibraryItem[],
  defaultFileName: string
): Promise<{ path: string } | { error: string }> {
  await ensurePackDir();

  const result = createPackFromItems(items, `Look Pack ${new Date().toLocaleDateString()}`, undefined, undefined);

  const selection = await dialog.showSaveDialog({
    title: "Export Look Pack",
    defaultPath: path.join(app.getPath("documents"), `${defaultFileName}.chromapack`),
    filters: [{ name: "Chroma Look Pack", extensions: ["chromapack"] }]
  });

  if (selection.canceled || !selection.filePath) {
    return { error: "Export cancelled" };
  }

  const packPath = selection.filePath.toLowerCase().endsWith(".chromapack")
    ? selection.filePath
    : `${selection.filePath}.chromapack`;

  const packContent = JSON.stringify({
    manifest: result.manifest,
    content: result.content
  }, null, 2);

  await writeFile(packPath, packContent, "utf8");

  return { path: packPath };
}

export async function importPack(
  options: PackImportOptions = { duplicateStrategy: "skip" }
): Promise<PackImportResult> {
  const selection = await dialog.showOpenDialog({
    title: "Import Look Pack",
    filters: [{ name: "Chroma Look Pack", extensions: ["chromapack", "json"] }],
    properties: ["openFile"]
  });

  if (selection.canceled || !selection.filePaths[0]) {
    return { imported: [], skipped: [], replaced: [], errors: [] };
  }

  return importPackFromPath(selection.filePaths[0], options);
}

export async function importPackFromPath(
  packPath: string,
  options: PackImportOptions = { duplicateStrategy: "skip" }
): Promise<PackImportResult> {
  const result: PackImportResult = {
    imported: [],
    skipped: [],
    replaced: [],
    errors: []
  };

  let packData: { manifest: PackManifest; content: string };
  let data: string;
  try {
    data = await readFile(packPath, "utf8");
    packData = JSON.parse(data);
  } catch {
    return { ...result, errors: [{ item: { id: "", originalId: "", type: "look", name: packPath, version: "", dataKind: "" }, error: "Failed to read pack file" }] };
  }

  const manifestValidation = validatePackManifest(packData.manifest);
  if (!manifestValidation.ok) {
    return { ...result, errors: [{ item: { id: "", originalId: "", type: "look", name: packPath, version: "", dataKind: "" }, error: manifestValidation.error }] };
  }

  const contentValidation = parsePackContent(manifestValidation.manifest, packData.content);
  if (!contentValidation.ok) {
    return { ...result, errors: [{ item: { id: "", originalId: "", type: "look", name: packPath, version: "", dataKind: "" }, error: contentValidation.error }] };
  }

  const existingItems = await loadLibrary();
  const mergedItems = [...existingItems];

  for (const item of contentValidation.items) {
    const trustOverride = options.trustOverride ?? item.trust;
    const itemWithTrust = { ...item, trust: trustOverride };

    const validation = validateLibraryItem(itemWithTrust);
    if (!validation.ok) {
      result.errors.push({
        item: { id: item.id, originalId: item.id, type: item.type, name: item.name, version: item.version, dataKind: item.data.kind },
        error: validation.errors.map(e => e.message).join("; ")
      });
      continue;
    }

    const existingIndex = mergedItems.findIndex(existingItem => existingItem.id === validation.item.id);
    if (existingIndex !== -1) {
      if (options.duplicateStrategy === "skip") {
        result.skipped.push({
          item: toPackManifestItem(item),
          reason: `Library item ${validation.item.id} already exists`
        });
        continue;
      }

      if (options.duplicateStrategy === "replace") {
        mergedItems[existingIndex] = {
          ...validation.item,
          updatedAt: Date.now()
        };
        result.replaced.push(mergedItems[existingIndex]);
        continue;
      }

      const renamedItem = {
        ...validation.item,
        id: createLibraryItemId(),
        name: uniqueImportedName(validation.item.name, mergedItems),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      mergedItems.push(renamedItem);
      result.imported.push(renamedItem);
      continue;
    }

    mergedItems.push(validation.item);
    result.imported.push(validation.item);
  }

  if (result.imported.length > 0 || result.replaced.length > 0) {
    await saveLibrary(mergedItems);
  }

  await installPackCopy(packPath, manifestValidation.manifest, data);

  return result;
}

export async function getInstalledPacks(): Promise<{ name: string; path: string; manifest: PackManifest }[]> {
  await ensurePackDir();
  const packDir = getPackDir();
  const packs: { name: string; path: string; manifest: PackManifest }[] = [];

  const { readdir } = await import("fs/promises");
  let files: string[];
  try {
    files = await readdir(packDir);
  } catch {
    return [];
  }

  for (const file of files) {
    if (!file.endsWith(".chromapack") && !file.endsWith(".json")) continue;

    try {
      const filePath = path.join(packDir, file);
      const data = await readFile(filePath, "utf8");
      const parsed = JSON.parse(data);
      const validation = validatePackManifest(parsed.manifest ?? parsed);
      if (validation.ok) {
        packs.push({ name: validation.manifest.name, path: filePath, manifest: validation.manifest });
      }
    } catch {
      // Skip invalid packs
    }
  }

  return packs;
}

export async function uninstallPack(packPath: string): Promise<boolean> {
  await ensurePackDir();

  const packDir = path.resolve(getPackDir());
  const resolvedPackPath = path.resolve(packPath);
  if (!isPathInsideDirectory(resolvedPackPath, packDir) || !isPackFile(resolvedPackPath)) {
    return false;
  }

  if (!existsSync(resolvedPackPath)) {
    return false;
  }

  await unlink(resolvedPackPath);
  return true;
}

function isPathInsideDirectory(targetPath: string, directoryPath: string): boolean {
  const relativePath = path.relative(directoryPath, targetPath);
  return relativePath !== "" && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

function isPackFile(filePath: string): boolean {
  return filePath.endsWith(".chromapack") || filePath.endsWith(".json");
}

function toPackManifestItem(item: LibraryItem): PackManifestItem {
  return {
    id: item.id,
    originalId: item.id,
    type: item.type,
    name: item.name,
    version: item.version,
    dataKind: item.data.kind
  };
}

function uniqueImportedName(name: string, items: LibraryItem[]): string {
  const names = new Set(items.map(item => item.name));
  let candidate = `${name} (Imported)`;
  let suffix = 2;

  while (names.has(candidate)) {
    candidate = `${name} (Imported ${suffix})`;
    suffix += 1;
  }

  return candidate;
}

async function installPackCopy(sourcePath: string, manifest: PackManifest, content: string): Promise<void> {
  await ensurePackDir();
  const packDir = getPackDir();
  const installPath = path.join(packDir, `${safePackFileName(manifest.packId)}.chromapack`);
  const resolvedSource = path.resolve(sourcePath);
  const resolvedInstall = path.resolve(installPath);

  if (resolvedSource === resolvedInstall) {
    return;
  }

  try {
    await copyFile(resolvedSource, resolvedInstall);
  } catch {
    await writeFile(resolvedInstall, content, "utf8");
  }
}

function safePackFileName(packId: string): string {
  const sanitized = packId.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/^-+|-+$/g, "");
  return sanitized || "imported-pack";
}
