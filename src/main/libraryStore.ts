import { app } from "electron";
import { existsSync } from "fs";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import {
  createLibraryItemId,
  LIBRARY_SCHEMA_VERSION,
  type LibraryItem,
  type LibraryValidationResult,
  validateLibraryItem
} from "../shared/library.js";
import type { LibraryAddRequest } from "../shared/ipc.js";

const LIBRARY_FILENAME = "library.json";

function getLibraryPath(): string {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, LIBRARY_FILENAME);
}

export interface LibraryStore {
  version: string;
  items: LibraryItem[];
  updatedAt: number;
}

export async function loadLibrary(): Promise<LibraryItem[]> {
  const libraryPath = getLibraryPath();

  if (!existsSync(libraryPath)) {
    return [];
  }

  try {
    const data = await readFile(libraryPath, "utf8");
    const store = JSON.parse(data) as LibraryStore;

    if (!Array.isArray(store.items)) {
      return [];
    }

    const validated: LibraryItem[] = [];
    const errors: string[] = [];

    for (let i = 0; i < store.items.length; i++) {
      const item = store.items[i];
      const result = validateLibraryItem(item);
      if (result.ok) {
        validated.push(result.item);
      } else {
        errors.push(`Item ${i} (${item?.id ?? "unknown"}): ${result.errors.map(e => e.message).join(", ")}`);
      }
    }

    if (errors.length > 0) {
      console.warn(`[LibraryStore] ${errors.length} items failed validation:`, errors);
    }

    return validated;
  } catch (err) {
    console.error("[LibraryStore] Failed to load library:", err);
    return [];
  }
}

export async function saveLibrary(items: LibraryItem[]): Promise<void> {
  const libraryPath = getLibraryPath();
  const dir = path.dirname(libraryPath);

  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  const store: LibraryStore = {
    version: "1.0.0",
    items,
    updatedAt: Date.now()
  };

  await writeFile(libraryPath, JSON.stringify(store, null, 2), "utf8");
}

export async function addLibraryItem(request: LibraryAddRequest): Promise<LibraryValidationResult> {
  const newItem: LibraryItem = {
    id: createLibraryItemId(),
    type: request.type,
    name: request.name,
    description: request.description,
    version: LIBRARY_SCHEMA_VERSION,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    author: request.author,
    authorId: request.authorId,
    tags: request.tags,
    thumbnail: request.thumbnail,
    favorite: request.favorite ?? false,
    compatibility: request.compatibility,
    trust: request.trust ?? "local",
    source: request.source,
    data: request.data as LibraryItem["data"]
  };

  const validation = validateLibraryItem(newItem);
  if (!validation.ok) {
    return validation;
  }

  const items = await loadLibrary();
  items.push(validation.item);
  await saveLibrary(items);

  return { ok: true, item: validation.item };
}

export async function updateLibraryItem(id: string, updates: Partial<LibraryItem>): Promise<LibraryValidationResult> {
  const items = await loadLibrary();
  const index = items.findIndex(item => item.id === id);

  if (index === -1) {
    return { ok: false, errors: [{ path: "id", code: "MISSING_REQUIRED", message: `Item ${id} not found` }] };
  }

  const updated: LibraryItem = {
    ...items[index],
    ...updates,
    id: items[index].id,
    createdAt: items[index].createdAt,
    updatedAt: Date.now()
  };

  const validation = validateLibraryItem(updated);
  if (!validation.ok) {
    return validation;
  }

  items[index] = validation.item;
  await saveLibrary(items);

  return { ok: true, item: validation.item };
}

export async function deleteLibraryItem(id: string): Promise<boolean> {
  const items = await loadLibrary();
  const index = items.findIndex(item => item.id === id);

  if (index === -1) {
    return false;
  }

  items.splice(index, 1);
  await saveLibrary(items);
  return true;
}

export async function getLibraryItem(id: string): Promise<LibraryItem | undefined> {
  const items = await loadLibrary();
  return items.find(item => item.id === id);
}

export async function duplicateLibraryItem(id: string, newName?: string): Promise<LibraryItem | undefined> {
  const items = await loadLibrary();
  const original = items.find(item => item.id === id);

  if (!original) {
    return undefined;
  }

  const duplicate: LibraryItem = {
    ...original,
    id: createLibraryItemId(),
    name: newName ?? `${original.name} (Copy)`,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const validation = validateLibraryItem(duplicate);
  if (!validation.ok) {
    return undefined;
  }

  items.push(validation.item);
  await saveLibrary(items);

  return validation.item;
}

export async function toggleLibraryItemFavorite(id: string): Promise<LibraryItem | undefined> {
  const items = await loadLibrary();
  const index = items.findIndex(item => item.id === id);

  if (index === -1) {
    return undefined;
  }

  items[index] = {
    ...items[index],
    favorite: !items[index].favorite,
    updatedAt: Date.now()
  };

  await saveLibrary(items);
  return items[index];
}