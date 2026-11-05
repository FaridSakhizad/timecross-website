import { useEffect, useRef, type RefObject } from 'react';

/** Calls `onClickOutside` when the pointer goes down outside `ref`, while `isEnabled` is true. */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  isEnabled: boolean,
  onClickOutside: () => void,
) {
  const onClickOutsideRef = useRef(onClickOutside);

  useEffect(() => {
    onClickOutsideRef.current = onClickOutside;
  });

  useEffect(() => {
    if (!isEnabled) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !ref.current?.contains(event.target)) {
        onClickOutsideRef.current();
      }
    };

    // Capture phase: elements that stop propagation still close the menu.
    document.addEventListener('pointerdown', handlePointerDown, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [isEnabled, ref]);
}
