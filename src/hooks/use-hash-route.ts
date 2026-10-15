import { useCallback, useEffect, useState } from 'react';

/** Pages other than the home screen and the reader. */
export type Page = 'plan' | 'daily' | 'prayer' | 'calendar' | 'adhkar' | 'more';
const PAGES: Page[] = ['plan', 'daily', 'prayer', 'calendar', 'adhkar', 'more'];

export interface Route {
  surah: number | null;
  ayah: number | null;
  /** A standalone page ("#/plan", "#/daily", "#/prayer", "#/calendar", "#/adhkar"), or null. */
  page: Page | null;
  /** Extra part of the page's address, e.g. the adhkar category in "#/adhkar/khatm". */
  param: string | null;
}

const HOME: Route = { surah: null, ayah: null, page: null, param: null };

// "#/s/2", "#/s/2/255" or "#/<page>" — gives deep links and a working browser back button.
function parse(hash: string): Route {
  const withParam = hash.match(/^#\/([a-z]+)\/([a-z-]+)$/);
  if (withParam && PAGES.includes(withParam[1] as Page)) return { ...HOME, page: withParam[1] as Page, param: withParam[2] };
  const page = PAGES.find(p => hash === `#/${p}`);
  if (page) return { ...HOME, page };
  const m = hash.match(/^#\/s\/(\d{1,3})(?:\/(\d{1,3}))?$/);
  if (!m) return HOME;
  const surah = Number(m[1]);
  if (surah < 1 || surah > 114) return HOME;
  return { ...HOME, surah, ayah: m[2] ? Number(m[2]) : null };
}

export function useHashRoute() {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const go = useCallback((surah: number | null, ayah?: number | null) => {
    window.location.hash = surah ? `#/s/${surah}${ayah ? `/${ayah}` : ''}` : '#/';
  }, []);

  const goPage = useCallback((page: Page, param?: string) => { window.location.hash = param ? `#/${page}/${param}` : `#/${page}`; }, []);

  return { route, go, goPage };
}
