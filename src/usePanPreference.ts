import { useSyncExternalStore, type SetStateAction } from 'react';

function createPanPreference(mode: 'desktop' | 'mobile') {
  const key = `timecross:pan:${mode}`;
  const listeners = new Set<() => void>();
  let fallback = false;
  let hasUnsavedValue = false;

  const getSnapshot = () => {
    if (hasUnsavedValue) return fallback;
    try {
      return window.localStorage.getItem(key) === 'true';
    } catch {
      return fallback;
    }
  };
  const notify = () => listeners.forEach((listener) => listener());
  const handleStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) notify();
  };
  const subscribe = (listener: () => void) => {
    if (listeners.size === 0) window.addEventListener('storage', handleStorage);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) window.removeEventListener('storage', handleStorage);
    };
  };
  const set = (value: SetStateAction<boolean>) => {
    fallback = typeof value === 'function' ? value(getSnapshot()) : value;
    try {
      window.localStorage.setItem(key, String(fallback));
      hasUnsavedValue = false;
    } catch {
      // Keep the control usable when browser storage is unavailable.
      hasUnsavedValue = true;
    }
    notify();
  };
  return { getSnapshot, subscribe, set };
}

const preferences = {
  desktop: createPanPreference('desktop'),
  mobile: createPanPreference('mobile'),
};
const getServerSnapshot = () => false;

export function usePanPreference(mode: 'desktop' | 'mobile') {
  const preference = preferences[mode];
  const enabled = useSyncExternalStore(
    preference.subscribe,
    preference.getSnapshot,
    getServerSnapshot,
  );
  return [enabled, preference.set] as const;
}
