import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadJSON, saveJSON } from '@/lib/storage';

export interface Mark {
  surah: number;
  ayah: number;
}

interface LibraryContextValue {
  bookmarks: Mark[];
  lastRead: Mark | null;
  isBookmarked: (surah: number, ayah: number) => boolean;
  toggleBookmark: (surah: number, ayah: number) => void;
  markRead: (surah: number, ayah: number) => void;
  /** Replace local data wholesale (used when syncing from the server). */
  replaceAll: (data: { bookmarks?: Mark[]; lastRead?: Mark | null }) => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [bookmarks, setBookmarks] = useState<Mark[]>(() => loadJSON<Mark[]>('quran.bookmarks', []));
  const [lastRead, setLastRead] = useState<Mark | null>(() => loadJSON<Mark | null>('quran.lastRead', null));

  useEffect(() => saveJSON('quran.bookmarks', bookmarks), [bookmarks]);
  useEffect(() => saveJSON('quran.lastRead', lastRead), [lastRead]);

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
    () => ({ bookmarks, lastRead, isBookmarked, toggleBookmark, markRead, replaceAll }),
    [bookmarks, lastRead, isBookmarked, toggleBookmark, markRead, replaceAll],
  );
  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside <LibraryProvider>');
  return ctx;
}
