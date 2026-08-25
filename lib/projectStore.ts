import type { EditorDoc } from "./types.ts";

// Local-first project persistence via IndexedDB. Everything the editor needs to
// resume - the document, all images (stored inline as data URLs), and the
// color-splash mask - lives in the browser. No image ever leaves the device,
// which keeps Precision fast, private, and free of any storage backend.

export type ProjectMeta = {
  id: string;
  name: string;
  updatedAt: number;
  thumb: string; // small data-URL preview
};

export type SavedProject = ProjectMeta & {
  doc: EditorDoc;
  mask: string | null; // color-splash mask as a data URL, or null
};

const DB_NAME = "precision";
const STORE = "projects";
const VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const store = db.transaction(STORE, mode).objectStore(STORE);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export async function listProjects(): Promise<ProjectMeta[]> {
  try {
    const all = await tx<SavedProject[]>("readonly", (s) => s.getAll() as IDBRequest<SavedProject[]>);
    return all
      .map(({ id, name, updatedAt, thumb }) => ({ id, name, updatedAt, thumb }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function getProject(id: string): Promise<SavedProject | null> {
  try {
    const p = await tx<SavedProject | undefined>(
      "readonly",
      (s) => s.get(id) as IDBRequest<SavedProject | undefined>,
    );
    return p ?? null;
  } catch {
    return null;
  }
}

export async function saveProject(p: SavedProject): Promise<void> {
  try {
    await tx("readwrite", (s) => s.put(p));
  } catch {
    /* storage unavailable (private mode / quota) - editing still works in-memory */
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    await tx("readwrite", (s) => s.delete(id));
  } catch {
    /* ignore */
  }
}
