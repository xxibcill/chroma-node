import { app, dialog } from "electron";
import { existsSync } from "fs";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { validateLibraryItem, type LibraryItem } from "../shared/library.js";
import {
  createPackFromItems,
  parsePackContent,
  validatePackManifest,
  type PackImportOptions,
  type PackImportResult,
  type PackManifest
} from "../shared/pack.js";

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
  try {
    const data = await readFile(packPath, "utf8");
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

    result.imported.push(validation.item);
  }

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
  if (!existsSync(packPath)) {
    return false;
  }

  const { unlink } = await import("fs/promises");
  await unlink(packPath);
  return true;
}