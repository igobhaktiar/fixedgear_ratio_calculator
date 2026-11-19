import { useEffect, useState } from 'react';

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

/** useState for an object that survives reloads. Storage failures are ignored. */
export function usePersistentState(key, fallback) {
  const [state, setState] = useState(() => read(key, fallback));

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* private mode / quota — ride on without persistence */
    }
  }, [key, state]);

  return [state, setState];
}
