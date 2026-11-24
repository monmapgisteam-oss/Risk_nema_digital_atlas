import type { AtlasItem } from "./atlas";

/**
 * Maps added from the user's computer (demo). Kept only in this browser's
 * IndexedDB; nothing is sent to the server or the portal.
 */
export type LocalMapMeta = {
  title: string;
  kind: AtlasItem["kind"];
  topic: string;
  hazard: string | null;
  scope: string;
  /** Read from the file name; older records have neither (= "mn", null). */
  lang?: "mn" | "en";
  unit?: string | null;
};

export type LocalMapRecord = LocalMapMeta & {
  id: string;
  file: string;
  blob: Blob;
  modified: number;
};

export const MAX_BYTES = 25 * 1024 * 1024;
export const ACCEPT = ["image/jpeg", "image/png", "image/webp"];

/** Why the file can't be added, or null when it can. */
export function checkFile(f: { type: string; size: number }): string | null {
  if (!ACCEPT.includes(f.type)) return "Зөвхөн JPG, PNG, WebP зураг оруулна.";
  if (f.size > MAX_BYTES) return "Файл 25MB-аас их байна.";
  return null;
}

/** A stored map as a gallery item; `url` is an object URL of its file. */
export function toAtlasItem(
  r: Omit<LocalMapRecord, "blob">,
  url: string,
): AtlasItem {
  const lang = r.lang ?? "mn";
  return {
    id: r.id,
    topic: r.topic,
    kind: r.kind,
    hazard: r.hazard,
    scope: r.scope,
    lang,
    // Always shown: the user added it on purpose.
    mn: true,
    en: lang === "en",
    title: r.title,
    unit: r.unit ?? null,
    file: r.file,
    img: url,
    thumb: url,
    modified: r.modified,
    local: true,
  };
}

/**
 * A new map id. Uses getRandomValues, which (unlike randomUUID) also works
 * on plain-http origins such as the dev server opened over the LAN.
 */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `local-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

const DB = "nema-atlas";
const STORE = "maps";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  op: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = op(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/** Every stored map, oldest first; empty when IndexedDB is unavailable. */
export async function listLocalMaps(): Promise<LocalMapRecord[]> {
  try {
    const all = await run("readonly", (s) => s.getAll() as IDBRequest<LocalMapRecord[]>);
    return all.sort((a, b) => a.modified - b.modified);
  } catch {
    return [];
  }
}

export async function addLocalMap(
  meta: LocalMapMeta,
  file: File,
): Promise<LocalMapRecord> {
  const rec: LocalMapRecord = {
    ...meta,
    id: newId(),
    file: file.name,
    blob: file,
    modified: Date.now(),
  };
  await run("readwrite", (s) => s.put(rec));
  return rec;
}

export async function deleteLocalMap(id: string): Promise<void> {
  await run("readwrite", (s) => s.delete(id));
}
