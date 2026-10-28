import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { SelectedGridHour } from '../shared/gridSelection';
import { attachMobileGridSelection } from './mobileGridSelectionController';
import { getVisibleMobileGridSelection } from './mobileGridSelectionGeometry';

export function useMobileGridSelection(
  hours: SelectedGridHour[], onChange: ((hours: SelectedGridHour[]) => void) | undefined,
  blocked: boolean, contentKey: string,
  viewportRef?: RefObject<HTMLDivElement | null>,
) {
  const [mode, setMode] = useState(hours.length > 0);
  const [isResizing, setIsResizing] = useState(false);
  const interactionRef = useRef(false);
  const layerRef = useRef<HTMLDivElement>(null);
  const contentKeyRef = useRef(contentKey);
  const enabled = mode && hours.length > 0 && !blocked;
  const clear = useCallback(() => { setMode(false); onChange?.([]); }, [onChange]);
  const toggle = useCallback(() => {
    if (blocked) return;
    if (enabled) { clear(); return; }
    const viewport = viewportRef?.current ?? undefined;
    const selection = getVisibleMobileGridSelection(viewport);
    if (!selection.length) return;
    onChange?.(selection);
    setMode(true);
  }, [blocked, clear, enabled, onChange, viewportRef]);

  useEffect(() => {
    if (contentKeyRef.current !== contentKey) {
      contentKeyRef.current = contentKey;
      onChange?.([]);
      return;
    }
    const layer = layerRef.current;
    if (!enabled || !layer) return;
    const controller = attachMobileGridSelection(layer, hours, (next) => onChange?.(next), (active) => {
      interactionRef.current = active;
      setIsResizing(active);
    }, viewportRef?.current ?? undefined);
    return () => controller.destroy();
  }, [contentKey, enabled, hours, onChange, viewportRef]);

  useEffect(() => {
    if (!enabled) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) clear();
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [clear, enabled]);

  return { enabled, toggle, clear, layerRef, interactionRef, isResizing };
}
