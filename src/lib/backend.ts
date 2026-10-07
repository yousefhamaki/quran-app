import type { Settings } from '@/context/settings';

/** Base URL of the Quran backend, e.g. http://localhost:4000/api. Sync is disabled when unset. */
export const API_URL: string | undefined = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');
export const syncAvailable = Boolean(API_URL);

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
  }
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
}

export interface ApiBookmark {
  id: string;
  surah: number;
  ayah: number;
}

async function request<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  if (!API_URL) throw new ApiError('Sync service is not configured', 0);
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) {
    throw new ApiError(body?.error?.message ?? res.statusText, res.status, body?.error?.code);
  }
  return body.data as T;
}

export interface AuthResult {
  token: string;
  user: ApiUser;
}

export const backend = {
  register: (name: string, email: string, password: string) =>
    request<AuthResult>('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  login: (email: string, password: string) =>
    request<AuthResult>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: (token: string) => request<unknown>('/auth/logout', { method: 'POST' }, token),
  me: (token: string) => request<ApiUser>('/auth/me', {}, token),

  bookmarks: (token: string) => request<ApiBookmark[]>('/bookmarks', {}, token),
  addBookmark: (token: string, surah: number, ayah: number) =>
    request<ApiBookmark>('/bookmarks', { method: 'POST', body: JSON.stringify({ surah, ayah }) }, token),
  removeBookmark: (token: string, id: string) => request<unknown>(`/bookmarks/${id}`, { method: 'DELETE' }, token),

  progress: (token: string) => request<{ surah: number | null; ayah: number | null }>('/progress', {}, token),
  saveProgress: (token: string, surah: number, ayah: number) =>
    request<unknown>('/progress', { method: 'PUT', body: JSON.stringify({ surah, ayah }) }, token),

  preferences: (token: string) => request<Settings>('/preferences', {}, token),
  savePreferences: (token: string, settings: Settings) =>
    request<Settings>('/preferences', { method: 'PUT', body: JSON.stringify(settings) }, token),
};
