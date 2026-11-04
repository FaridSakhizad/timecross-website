import { useCallback, useSyncExternalStore } from 'react';

import {
  getServerSettings,
  getSettings,
  subscribeSettings,
  updateSettings,
} from './settings';

/**
 * Time format and color mode shared by every page.
 * Reads from the settings store, so all widgets and open tabs stay in sync.
 */
export function usePreferences() {
  const settings = useSyncExternalStore(subscribeSettings, getSettings, getServerSettings);

  const toggleTimeFormat = useCallback(() => {
    updateSettings((currentSettings) => ({
      ...currentSettings,
      timeFormat: currentSettings.timeFormat === '24h' ? '12h' : '24h',
    }));
  }, []);

  const toggleColorMode = useCallback(() => {
    updateSettings((currentSettings) => ({
      ...currentSettings,
      colorMode: currentSettings.colorMode === 'night' ? 'day' : 'night',
    }));
  }, []);

  return {
    timeFormat: settings.timeFormat,
    colorMode: settings.colorMode,
    toggleTimeFormat,
    toggleColorMode,
  };
}
