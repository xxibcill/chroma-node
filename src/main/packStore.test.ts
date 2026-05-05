import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LibraryItem } from "../shared/library";
import { createPackFromItems } from "../shared/pack";
import { getInstalledPacks, importPackFromPath, uninstallPack } from "./packStore";

const electronMock = vi.hoisted(() => ({
  userDataPath: "",
  documentsPath: ""
}));

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === "userData") {
        return electronMock.userDataPath;
      }
      if (name === "documents") {
        return electronMock.documentsPath;
      }
      return electronMock.userDataPath;
    })
  },
  dialog: {
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn()
  }
}));

describe("packStore", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "chroma-pack-store-"));
    electronMock.userDataPath = path.join(tempDir, "user-data");
    electronMock.documentsPath = path.join(tempDir, "documents");
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("uninstalls pack files from the app pack directory", async () => {
    const packDir = path.join(electronMock.userDataPath, "packs");
    const packPath = path.join(packDir, "valid.chromapack");
    await fs.mkdir(packDir, { recursive: true });
    await fs.writeFile(packPath, "{}", "utf8");

    await expect(uninstallPack(packPath)).resolves.toBe(true);
    await expect(fs.stat(packPath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects renderer-supplied paths outside the app pack directory", async () => {
    const outsidePath = path.join(tempDir, "outside.chromapack");
    await fs.writeFile(outsidePath, "keep", "utf8");

    await expect(uninstallPack(outsidePath)).resolves.toBe(false);
    await expect(fs.readFile(outsidePath, "utf8")).resolves.toBe("keep");
  });

  it("rejects non-pack files inside the app pack directory", async () => {
    const packDir = path.join(electronMock.userDataPath, "packs");
    const textPath = path.join(packDir, "notes.txt");
    await fs.mkdir(packDir, { recursive: true });
    await fs.writeFile(textPath, "keep", "utf8");

    await expect(uninstallPack(textPath)).resolves.toBe(false);
    await expect(fs.readFile(textPath, "utf8")).resolves.toBe("keep");
  });

  it("persists imported pack items to the library and installs the pack", async () => {
    const packPath = path.join(tempDir, "warm-look.chromapack");
    await writePack(packPath, [createLook("look-1", "Warm Look")]);

    const result = await importPackFromPath(packPath, { duplicateStrategy: "skip" });

    expect(result.imported).toHaveLength(1);
    expect(result.skipped).toHaveLength(0);
    await expect(readLibraryItems()).resolves.toMatchObject([
      { id: "look-1", name: "Warm Look" }
    ]);
    await expect(getInstalledPacks()).resolves.toHaveLength(1);
  });

  it("honors duplicate import strategies when saving library items", async () => {
    const firstPackPath = path.join(tempDir, "first.chromapack");
    const secondPackPath = path.join(tempDir, "second.chromapack");
    await writePack(firstPackPath, [createLook("look-1", "Warm Look")]);
    await writePack(secondPackPath, [createLook("look-1", "Updated Look")]);

    await importPackFromPath(firstPackPath, { duplicateStrategy: "skip" });
    const skipped = await importPackFromPath(secondPackPath, { duplicateStrategy: "skip" });

    expect(skipped.skipped).toHaveLength(1);
    await expect(readLibraryItems()).resolves.toMatchObject([
      { id: "look-1", name: "Warm Look" }
    ]);

    const replaced = await importPackFromPath(secondPackPath, { duplicateStrategy: "replace" });
    expect(replaced.replaced).toHaveLength(1);
    await expect(readLibraryItems()).resolves.toMatchObject([
      { id: "look-1", name: "Updated Look" }
    ]);

    const renamed = await importPackFromPath(secondPackPath, { duplicateStrategy: "rename" });
    expect(renamed.imported).toHaveLength(1);
    const items = await readLibraryItems();
    expect(items).toHaveLength(2);
    expect(items.map(item => item.id)).toContain("look-1");
    expect(items[1].id).not.toBe("look-1");
    expect(items[1].name).toBe("Updated Look (Imported)");
  });
});

function createLook(id: string, name: string): LibraryItem {
  return {
    id,
    type: "look",
    name,
    version: "1.0.0",
    createdAt: 1,
    updatedAt: 1,
    tags: [],
    favorite: false,
    compatibility: { colorProfiles: ["rec709"] },
    trust: "local",
    data: {
      kind: "look",
      nodes: [],
      compatibleProfiles: ["rec709"]
    }
  };
}

async function writePack(packPath: string, items: LibraryItem[]): Promise<void> {
  const pack = createPackFromItems(items, path.basename(packPath, path.extname(packPath)));
  await fs.writeFile(packPath, JSON.stringify(pack, null, 2), "utf8");
}

async function readLibraryItems(): Promise<LibraryItem[]> {
  const libraryPath = path.join(electronMock.userDataPath, "library.json");
  const raw = await fs.readFile(libraryPath, "utf8");
  const parsed = JSON.parse(raw) as { items: LibraryItem[] };
  return parsed.items;
}
