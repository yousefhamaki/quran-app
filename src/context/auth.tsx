import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { backend, syncAvailable, ApiError, type ApiBookmark, type ApiUser } from '@/lib/backend';
import { useSettings } from '@/context/settings';
import { useLibrary, type Mark } from '@/context/library';

interface AuthContextValue {
  user: ApiUser | null;
  syncAvailable: boolean;
  busy: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const TOKEN_KEY = 'quran.token';

const readToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
const writeToken = (t: string | null) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
};
const key = (m: Mark) => `${m.surah}:${m.ayah}`;

/**
 * Guest-first: the app works fully offline-ish with localStorage. Signing in turns on sync —
 * server data is pulled once (bookmarks are merged, progress/settings from the server win when
 * present), then local changes are pushed in the background.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { settings, replace, t } = useSettings();
  const { bookmarks, lastRead, replaceAll } = useLibrary();
  const [token, setToken] = useState<string | null>(readToken);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false); // initial pull finished — safe to push
  const serverMarks = useRef(new Map<string, string>()); // "surah:ayah" -> server id
  const latest = useRef({ settings, bookmarks, lastRead });
  latest.current = { settings, bookmarks, lastRead };

  const pull = useCallback(async (tk: string) => {
    const [remoteMarks, progress, prefs] = await Promise.all([backend.bookmarks(tk), backend.progress(tk), backend.preferences(tk)]);
    serverMarks.current = new Map(remoteMarks.map((b: ApiBookmark) => [key(b), b.id]));
    const local = latest.current.bookmarks;
    const merged = [...remoteMarks.map(b => ({ surah: b.surah, ayah: b.ayah })), ...local.filter(m => !serverMarks.current.has(key(m)))];
    // Push local-only bookmarks so both sides converge.
    await Promise.all(
      local.filter(m => !serverMarks.current.has(key(m))).map(async m => {
        const created = await backend.addBookmark(tk, m.surah, m.ayah);
        serverMarks.current.set(key(m), created.id);
      }),
    );
    replaceAll({
      bookmarks: merged,
      ...(progress.surah && progress.ayah ? { lastRead: { surah: progress.surah, ayah: progress.ayah } } : {}),
    });
    replace(prefs);
  }, [replace, replaceAll]);

  // Restore an existing session on load.
  useEffect(() => {
    if (!token || !syncAvailable) return;
    let cancelled = false;
    (async () => {
      try {
        const me = await backend.me(token);
        if (cancelled) return;
        setUser(me);
        await pull(token);
        if (!cancelled) setReady(true);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) { writeToken(null); setToken(null); setUser(null); }
      }
    })();
    return () => { cancelled = true; };
  }, [token, pull]);

  // Push bookmark changes.
  useEffect(() => {
    if (!ready || !token) return;
    const local = new Map(bookmarks.map(m => [key(m), m]));
    for (const [k, m] of local) {
      if (!serverMarks.current.has(k)) {
        serverMarks.current.set(k, ''); // reserve to avoid duplicate posts
        backend.addBookmark(token, m.surah, m.ayah).then(b => serverMarks.current.set(k, b.id)).catch(() => serverMarks.current.delete(k));
      }
    }
    for (const [k, id] of serverMarks.current) {
      if (!local.has(k) && id) {
        serverMarks.current.delete(k);
        backend.removeBookmark(token, id).catch(() => {});
      }
    }
  }, [bookmarks, ready, token]);

  // Push reading progress and settings, debounced so scrolling/typing doesn't spam the API.
  useEffect(() => {
    if (!ready || !token || !lastRead) return;
    const id = setTimeout(() => backend.saveProgress(token, lastRead.surah, lastRead.ayah).catch(() => {}), 1200);
    return () => clearTimeout(id);
  }, [lastRead, ready, token]);

  useEffect(() => {
    if (!ready || !token) return;
    const id = setTimeout(() => backend.savePreferences(token, settings).catch(() => {}), 800);
    return () => clearTimeout(id);
  }, [settings, ready, token]);

  const finish = useCallback((result: { token: string; user: ApiUser }) => {
    writeToken(result.token);
    setReady(false);
    setUser(result.user);
    setToken(result.token);
    toast.success(t('signedIn'));
  }, [t]);

  const signIn = useCallback(async (email: string, password: string) => {
    setBusy(true);
    try { finish(await backend.login(email, password)); } finally { setBusy(false); }
  }, [finish]);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    setBusy(true);
    try { finish(await backend.register(name, email, password)); } finally { setBusy(false); }
  }, [finish]);

  const signOut = useCallback(async () => {
    if (token) await backend.logout(token).catch(() => {});
    writeToken(null);
    setToken(null);
    setUser(null);
    setReady(false);
    serverMarks.current = new Map();
    toast(t('signedOut'));
  }, [token, t]);

  const value = useMemo(() => ({ user, syncAvailable, busy, signIn, signUp, signOut }), [user, busy, signIn, signUp, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
