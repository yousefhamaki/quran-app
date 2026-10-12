import { useCallback, useEffect, useState } from 'react';

export interface Route {
  surah: number | null;
  ayah: number | null;
  /** The memorization plan page ("#/plan"). */
  plan: boolean;
}

const HOME: Route = { surah: null, ayah: null, plan: false };

// "#/s/2", "#/s/2/255" or "#/plan" — gives deep links and a working browser back button.
function parse(hash: string): Route {
  if (hash === '#/plan') return { ...HOME, plan: true };
  const m = hash.match(/^#\/s\/(\d{1,3})(?:\/(\d{1,3}))?$/);
  if (!m) return HOME;
  const surah = Number(m[1]);
  if (surah < 1 || surah > 114) return HOME;
  return { surah, ayah: m[2] ? Number(m[2]) : null, plan: false };
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

  const goPlan = useCallback(() => { window.location.hash = '#/plan'; }, []);

  return { route, go, goPlan };
}
