import { refreshWidgets } from '@/lib/widgets';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { loadJSON, saveJSON } from '@/lib/storage';
import { addFolder, assignTo, EMPTY_FOLDERS, newFolderId, normalizeFolders, removeFolder, renameFolder, type BookmarkFolders } from '@/lib/folders';
import { annotate, markKey, type Annotation, type Annotations, type HighlightColor } from '@/lib/study';

export interface Mark {
  surah: number;
  ayah: number;
}

interface LibraryContextValue {
  bookmarks: Mark[];
  /** Highlight colour and note per ayah (key "surah:ayah"). */
  annotations: Annotations;
  annotationOf: (surah: number, ayah: number) => Annotation | undefined;
  setHighlight: (surah: number, ayah: number, color: HighlightColor | null) => void;
  setNote: (surah: number, ayah: number, note: string | null) => void;
  lastRead: Mark | null;
  /** Bookmark folders (a local layer: the bookmarks themselves stay a plain list). */
  folders: BookmarkFolders;
  /** Returns false when the name is empty, already used or there are too many folders. */
  createFolder: (name: string) => boolean;
  renameBookmarkFolder: (id: string, name: string) => boolean;
  deleteFolder: (id: string) => void;
  moveBookmark: (surah: number, ayah: number, folderId: string | null) => void;
  isBookmarked: (surah: number, ayah: number) => boolean;
  toggleBookmark: (surah: number, ayah: number) => void;
  markRead: (surah: number, ayah: number) => void;
  /** Replace local data wholesale (used when syncing from the server). */
  replaceAll: (data: { bookmarks?: Mark[]; lastRead?: Mark | null }) => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [bookmarks, setBookmarks] = useState<Mark[]>(() => loadJSON<Mark[]>('quran.bookmarks', []));
  const [annotations, setAnnotations] = useState<Annotations>(() => loadJSON<Annotations>('quran.annotations', {}));
  const [folders, setFolders] = useState<BookmarkFolders>(() => normalizeFolders(loadJSON('quran.bookmarkFolders', EMPTY_FOLDERS)));
  const [lastRead, setLastRead] = useState<Mark | null>(() => loadJSON<Mark | null>('quran.lastRead', null));

  useEffect(() => saveJSON('quran.bookmarks', bookmarks), [bookmarks]);
  useEffect(() => { saveJSON('quran.lastRead', lastRead); void refreshWidgets(); }, [lastRead]);
  useEffect(() => saveJSON('quran.annotations', annotations), [annotations]);
  useEffect(() => saveJSON('quran.bookmarkFolders', folders), [folders]);
  const foldersRef = useRef(folders);
  foldersRef.current = folders;
  const createFolder = useCallback((name: string) => {
    const next = addFolder(foldersRef.current, name, newFolderId());
    if (!next) return false;
    foldersRef.current = next;
    setFolders(next);
    return true;
  }, []);
  const renameBookmarkFolder = useCallback((id: string, name: string) => {
    const next = renameFolder(foldersRef.current, id, name);
    if (!next) return false;
    foldersRef.current = next;
    setFolders(next);
    return true;
  }, []);
  const deleteFolder = useCallback((id: string) => setFolders(f => removeFolder(f, id)), []);
  const moveBookmark = useCallback((s: number, a: number, folderId: string | null) => setFolders(f => assignTo(f, `${s}:${a}`, folderId)), []);
  const annotationOf = useCallback((s: number, a: number) => annotations[markKey(s, a)], [annotations]);
  const setHighlight = useCallback((s: number, a: number, color: HighlightColor | null) => setAnnotations(all => annotate(all, s, a, { color })), []);
  const setNote = useCallback((s: number, a: number, note: string | null) => setAnnotations(all => annotate(all, s, a, { note })), []);

  const isBookmarked = useCallback((s: number, a: number) => bookmarks.some(b => b.surah === s && b.ayah === a), [bookmarks]);
  const toggleBookmark = useCallback((surah: number, ayah: number) => {
    setBookmarks(list =>
      list.some(b => b.surah === surah && b.ayah === ayah)
        ? list.filter(b => !(b.surah === surah && b.ayah === ayah))
        : [...list, { surah, ayah }],
    );
  }, []);
  const markRead = useCallback((surah: number, ayah: number) => setLastRead({ surah, ayah }), []);
  const replaceAll = useCallback((data: { bookmarks?: Mark[]; lastRead?: Mark | null }) => {
    if (data.bookmarks) setBookmarks(data.bookmarks);
    if (data.lastRead !== undefined) setLastRead(data.lastRead);
  }, []);

  const value = useMemo(
    () => ({ bookmarks, annotations, annotationOf, setHighlight, setNote, lastRead, folders, createFolder, renameBookmarkFolder, deleteFolder, moveBookmark, isBookmarked, toggleBookmark, markRead, replaceAll }),
    [bookmarks, annotations, annotationOf, setHighlight, setNote, lastRead, folders, createFolder, renameBookmarkFolder, deleteFolder, moveBookmark, isBookmarked, toggleBookmark, markRead, replaceAll],
  );
  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside <LibraryProvider>');
  return ctx;
}
