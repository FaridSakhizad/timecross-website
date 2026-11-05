import { useCallback, useSyncExternalStore, type SetStateAction } from 'react';

import {
  getServerSettings,
  getSettings,
  subscribeSettings,
  updateSettings,
} from './settings';

/**
 * Time format, color mode and the planner pan switch, shared by every page.
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

  const setPlannerPanEnabled = useCallback((value: SetStateAction<boolean>) => {
    updateSettings((currentSettings) => ({
      ...currentSettings,
      isPlannerPanEnabled: typeof value === 'function' ? value(currentSettings.isPlannerPanEnabled) : value,
    }));
  }, []);

  return {
    timeFormat: settings.timeFormat,
    colorMode: settings.colorMode,
    isPlannerPanEnabled: settings.isPlannerPanEnabled,
    toggleTimeFormat,
    toggleColorMode,
    setPlannerPanEnabled,
  };
}
