import { useCallback, useEffect, useRef, useState } from 'react';
import type { SelectedGridHour } from '../desktop/gridSelection';
import { attachMobileGridSelection } from './mobileGridSelectionController';
import { getInitialMobileGridSelection, getMobileGridSelectionCells, getMobileGridVisibleRect } from './mobileGridSelectionGeometry';

export function useMobileGridSelection(
  hours: SelectedGridHour[], onChange: ((hours: SelectedGridHour[]) => void) | undefined,
  blocked: boolean, contentKey: string,
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
    const visible = getMobileGridVisibleRect();
    const anchor = document.querySelector('.timelineGrid-addTimezoneButton_mobile')?.getBoundingClientRect();
    const targetX = anchor ? window.scrollX + (anchor.left + anchor.right) / 2 : (visible.left + visible.right) / 2;
    const targetY = window.scrollY + window.innerHeight / 2;
    const selection = getInitialMobileGridSelection(getMobileGridSelectionCells(), visible, targetX, targetY);
    if (!selection.length) return;
    onChange?.(selection);
    setMode(true);
  }, [blocked, clear, enabled, onChange]);

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
    });
    return () => controller.destroy();
  }, [contentKey, enabled, hours, onChange]);

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
