import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { attachGridSelection } from './gridSelectionController';
import type { SelectedGridHour } from '../shared/gridSelection';

export function useGridSelection(viewportRef: RefObject<HTMLDivElement | null>, enabled: boolean, contentKey: string,
  blocked = false, initialSelection: SelectedGridHour[] = [], onChange?: (hours: SelectedGridHour[]) => void) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<ReturnType<typeof attachGridSelection> | null>(null);
  const selectionRef = useRef<SelectedGridHour[]>(initialSelection);
  const contentKeyRef = useRef(contentKey);
  const interactionRef = useRef(false);
  const [selectedHours, setSelectedHours] = useState<SelectedGridHour[]>(initialSelection);
  const [isSelecting, setIsSelecting] = useState(false);
  const commit = useCallback((hours: SelectedGridHour[]) => {
    selectionRef.current = hours;
    setSelectedHours(hours);
    onChange?.(hours);
  }, [onChange]);
  const clearSelection = useCallback(() => {
    if (controllerRef.current) controllerRef.current.clear();
    else commit([]);
  }, [commit]);
  const createSelection = useCallback(() => controllerRef.current?.create() ?? false, []);

  useEffect(() => {
    if (contentKeyRef.current !== contentKey) {
      contentKeyRef.current = contentKey;
      commit([]);
    }
    const viewport = viewportRef.current;
    const overlay = overlayRef.current;
    if (blocked || !viewport || !overlay) return;
    const controller = attachGridSelection(viewport, overlay, selectionRef.current, commit, (active) => {
      interactionRef.current = active;
      setIsSelecting(active);
    }, { selectionFrame: frameRef.current ?? undefined, marqueeEnabled: enabled });
    controllerRef.current = controller;
    return () => { controller.destroy(); controllerRef.current = null; };
  }, [blocked, commit, contentKey, enabled, viewportRef]);

  return { selectedHours, isSelecting, interactionRef, overlayRef, frameRef, clearSelection, createSelection };
}
