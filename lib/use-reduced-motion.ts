'use client';
import { useSyncExternalStore } from 'react';

const Q = '(prefers-reduced-motion: reduce)';
const subscribe = (cb: () => void) => {
  const m = matchMedia(Q);
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
};
/** false on the server and during hydration; the real value right after. */
export const useReducedMotion = () => useSyncExternalStore(subscribe, () => matchMedia(Q).matches, () => false);
