import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

import type { SelectedGridSlot } from '../shared/gridSelection';

import { attachGridSelection, type GridSelectionInteraction } from './gridSelectionController';

export function useGridSelection(viewportRef: RefObject<HTMLDivElement | null>, enabled: boolean, contentKey: string, blocked = false, initialSelection: SelectedGridSlot[] = [], onChange?: (hours: SelectedGridSlot[]) => void) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<ReturnType<typeof attachGridSelection> | null>(null);
  const selectionRef = useRef<SelectedGridSlot[]>(initialSelection);
  const contentKeyRef = useRef(contentKey);
  const initialSelectionRef = useRef(initialSelection);
  const interactionRef = useRef(false);
  const [selectedHours, setSelectedHours] = useState<SelectedGridSlot[]>(initialSelection);
  const [interaction, setInteraction] = useState<GridSelectionInteraction | null>(null);
  const commit = useCallback((hours: SelectedGridSlot[]) => {
    selectionRef.current = hours;
    setSelectedHours(hours);
    onChange?.(hours);
  }, [onChange]);
  const clearSelection = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.clear();
    } else {
      commit([]);
    }
  }, [commit]);
  const createSelection = useCallback(() => controllerRef.current?.create() ?? false, []);

  useEffect(() => {
    initialSelectionRef.current = initialSelection;
  });

  useEffect(() => {
    // Other cells (another day, other cities): the selection is the session's, which moved to the
    // new day or was dropped with the cities.
    if (contentKeyRef.current !== contentKey) {
      contentKeyRef.current = contentKey;
      commit(initialSelectionRef.current);
    }

    const viewport = viewportRef.current;
    const overlay = overlayRef.current;

    if (blocked || !viewport || !overlay) {
      return;
    }

    const controller = attachGridSelection(viewport, overlay, selectionRef.current, commit, (next) => {
      interactionRef.current = next !== null;
      setInteraction(next);
    }, { selectionFrame: frameRef.current ?? undefined, marqueeEnabled: enabled });

    controllerRef.current = controller;

    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [blocked, commit, contentKey, enabled, viewportRef]);

  return {
    selectedHours,
    isSelecting: interaction !== null,
    isResizing: interaction === 'resize',
    interactionRef,
    overlayRef,
    frameRef,
    clearSelection,
    createSelection,
  };
}
