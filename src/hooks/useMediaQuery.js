import { useState, useEffect } from 'react';

/**
 * Returns true when the viewport matches the given media query.
 * Use for conditional layout (e.g. desktop vs mobile).
 * @param {string} query - e.g. '(min-width: 768px)' or '(min-width: 1024px)'
 * @returns {boolean}
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    setMatches(mql.matches);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/** True when viewport is at least 768px (tablet and up). */
export function useIsTablet() {
  return useMediaQuery('(min-width: 768px)');
}

/** True when viewport is at least 1024px (desktop). */
export function useIsDesktop() {
  return useMediaQuery('(min-width: 1024px)');
}
