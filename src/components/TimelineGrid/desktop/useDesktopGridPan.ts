import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { attachDesktopGridPan } from './gridPanController';

export function useDesktopGridPan(
  viewportRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
  onInteractionChange?: (active: boolean) => void,
  blocked = false,
) {
  const controllerRef = useRef<ReturnType<typeof attachDesktopGridPan> | null>(null);
  const interactionRef = useRef(false);
  const [isPanning, setIsPanning] = useState(false);
  const cancelPan = useCallback(() => controllerRef.current?.cancel(), []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (blocked || !viewport) return;
    const controller = attachDesktopGridPan(viewport, (active) => {
      // Stop pending snaps synchronously, before React updates the UI.
      interactionRef.current = active;
      onInteractionChange?.(active);
      setIsPanning(active);
    }, enabled);
    controllerRef.current = controller;
    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [blocked, enabled, onInteractionChange, viewportRef]);

  return { isPanning, interactionRef, cancelPan };
}
