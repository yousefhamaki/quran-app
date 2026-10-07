import { useCallback, useEffect, useState } from 'react';

export interface Route {
  surah: number | null;
  ayah: number | null;
}

// "#/s/2" or "#/s/2/255" — gives deep links and a working browser back button.
function parse(hash: string): Route {
  const m = hash.match(/^#\/s\/(\d{1,3})(?:\/(\d{1,3}))?$/);
  if (!m) return { surah: null, ayah: null };
  const surah = Number(m[1]);
  if (surah < 1 || surah > 114) return { surah: null, ayah: null };
  return { surah, ayah: m[2] ? Number(m[2]) : null };
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

  return { route, go };
}
