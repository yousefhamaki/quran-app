/**
 * Bookmark folders: named collections the user files bookmarks into. Kept apart from the bookmarks themselves
 * (a bookmark is just surah + ayah and is synced with the server), so folders are a local layer on top.
 * (No imports on purpose, so this file can be unit-tested with plain Node.)
 */

export interface Folder {
  id: string;
  name: string;
}

export interface BookmarkFolders {
  folders: Folder[];
  /** "surah:ayah" → folder id. A bookmark that is not here is unfiled. */
  assign: Record<string, string>;
}

export const EMPTY_FOLDERS: BookmarkFolders = { folders: [], assign: {} };

export const MAX_FOLDERS = 30;
export const MAX_NAME = 30;

export const markKeyOf = (surah: number, ayah: number) => `${surah}:${ayah}`;

const clean = (name: string) => name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);

/** Adds a folder; null when the name is empty, already used (any case) or there are too many folders. */
export function addFolder(state: BookmarkFolders, name: string, id: string): BookmarkFolders | null {
  const n = clean(name);
  if (!n || state.folders.length >= MAX_FOLDERS) return null;
  if (state.folders.some(f => f.name.toLowerCase() === n.toLowerCase())) return null;
  return { ...state, folders: [...state.folders, { id, name: n }] };
}

export function renameFolder(state: BookmarkFolders, id: string, name: string): BookmarkFolders | null {
  const n = clean(name);
  if (!n || !state.folders.some(f => f.id === id)) return null;
  if (state.folders.some(f => f.id !== id && f.name.toLowerCase() === n.toLowerCase())) return null;
  return { ...state, folders: state.folders.map(f => (f.id === id ? { ...f, name: n } : f)) };
}

/** Removes a folder; its bookmarks go back to unfiled (they are not deleted). */
export function removeFolder(state: BookmarkFolders, id: string): BookmarkFolders {
  const assign: Record<string, string> = {};
  for (const [k, v] of Object.entries(state.assign)) if (v !== id) assign[k] = v;
  return { folders: state.folders.filter(f => f.id !== id), assign };
}

/** Files a bookmark into a folder (null = unfiled). */
export function assignTo(state: BookmarkFolders, key: string, folderId: string | null): BookmarkFolders {
  const assign = { ...state.assign };
  if (folderId && state.folders.some(f => f.id === folderId)) assign[key] = folderId;
  else delete assign[key];
  return { ...state, assign };
}

export const folderOf = (state: BookmarkFolders, key: string): string | null => state.assign[key] ?? null;

/** Bookmarks shown for a filter: 'all', 'none' (unfiled) or a folder id. */
export function filterMarks<T extends { surah: number; ayah: number }>(state: BookmarkFolders, marks: T[], filter: string): T[] {
  if (filter === 'all') return marks;
  if (filter === 'none') return marks.filter(m => !folderOf(state, markKeyOf(m.surah, m.ayah)));
  return marks.filter(m => folderOf(state, markKeyOf(m.surah, m.ayah)) === filter);
}

export function countIn<T extends { surah: number; ayah: number }>(state: BookmarkFolders, marks: T[], filter: string): number {
  return filterMarks(state, marks, filter).length;
}

/** A fresh id for a folder. */
export const newFolderId = () => `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Fix whatever was saved so the screen can trust it. */
export function normalizeFolders(raw: unknown): BookmarkFolders {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<BookmarkFolders>;
  const seen = new Set<string>();
  const folders: Folder[] = [];
  for (const f of Array.isArray(r.folders) ? r.folders : []) {
    const id = typeof f?.id === 'string' ? f.id : '';
    const name = typeof f?.name === 'string' ? clean(f.name) : '';
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    folders.push({ id, name });
  }
  const assign: Record<string, string> = {};
  for (const [k, v] of Object.entries(r.assign ?? {})) if (typeof v === 'string' && seen.has(v)) assign[k] = v;
  return { folders: folders.slice(0, MAX_FOLDERS), assign };
}
