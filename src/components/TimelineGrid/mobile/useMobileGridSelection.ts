import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

import type { SelectedGridSlot } from '../shared/gridSelection';

import { attachMobileGridSelection } from './mobileGridSelectionController';
import { getVisibleMobileGridSelection } from './mobileGridSelectionGeometry';

export function useMobileGridSelection(
  hours: SelectedGridSlot[],
  onChange: ((hours: SelectedGridSlot[]) => void) | undefined,
  blocked: boolean,
  contentKey: string,
  viewportRef?: RefObject<HTMLDivElement | null>,
  contentRef?: RefObject<HTMLDivElement | null>,
) {
  const [mode, setMode] = useState(hours.length > 0);
  const [isResizing, setIsResizing] = useState(false);
  const interactionRef = useRef(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const hoursRef = useRef(hours);
  const controllerRef = useRef<ReturnType<typeof attachMobileGridSelection> | null>(null);
  const enabled = mode && hours.length > 0 && !blocked;
  const clear = useCallback(() => {
    setMode(false);
    onChange?.([]);
  }, [onChange]);
  const toggle = useCallback(() => {
    if (blocked) {
      return;
    }

    if (enabled) {
      clear();
      return;
    }

    const viewport = viewportRef?.current ?? undefined;
    const selection = getVisibleMobileGridSelection(viewport, contentRef?.current ?? undefined);

    if (!selection.length) {
      return;
    }

    onChange?.(selection);
    setMode(true);
  }, [blocked, clear, enabled, onChange, viewportRef, contentRef]);

  useEffect(() => {
    hoursRef.current = hours;
    controllerRef.current?.setSelection(hours);
  }, [hours]);

  // Other cells (another day, other cities, see contentKey) attach the controller again, with the
  // session's selection: moved to the new day, or dropped with the cities.
  useEffect(() => {
    const frame = frameRef.current;

    if (!enabled || !frame) {
      return;
    }

    const controller = attachMobileGridSelection(frame, hoursRef.current, (next) => onChange?.(next), (active) => {
      interactionRef.current = active;
      setIsResizing(active);
    }, viewportRef?.current ?? undefined);

    controllerRef.current = controller;

    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [contentKey, enabled, onChange, viewportRef]);

  return { enabled, toggle, clear, frameRef, interactionRef, isResizing };
}
