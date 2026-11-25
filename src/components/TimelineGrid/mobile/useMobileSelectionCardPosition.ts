import { useLayoutEffect, type RefObject } from 'react';

import {
  applyCardPlacement,
  chooseCardSide,
  getCardPlacement,
  readFrameBox,
  type CardBox,
  type CardSide,
} from '../shared/selectionCardPlacement';

import { getMobileGridVisibleRect } from './mobileGridSelectionGeometry';

/**
 * Keeps the selection card over the grid on a phone. Open, it is in the middle of the screen across
 * (a phone has no room beside the frame); folded into its icon, beside the frame as on a desktop.
 * Down, in both, it is held under the hour labels while the frame is in the view (see
 * getCardPlacement). The card is in the grid's content, so it is placed again on every scroll of
 * the page or of the widget's own scroller.
 */
export function useMobileSelectionCardPosition(
  frameRef: RefObject<HTMLDivElement | null>,
  cardRef: RefObject<HTMLDivElement | null>,
  /** The widget's own scroller in a page; none when the page scrolls. */
  viewportRef: RefObject<HTMLDivElement | null> | undefined,
  /** Changes whenever the selection settles somewhere else, or the card opens or folds; empty without a card. */
  selectionKey: string,
  collapsed: boolean,
) {
  useLayoutEffect(() => {
    const frame = frameRef.current;
    const card = cardRef.current;
    const content = card?.offsetParent;
    const viewport = viewportRef?.current ?? undefined;

    if (!selectionKey || !frame || !card || !(content instanceof HTMLElement)) {
      return undefined;
    }

    // The visible part of the grid, in the content's coordinates.
    const readView = (): CardBox => {
      const visible = getMobileGridVisibleRect(viewport);
      const rect = content.getBoundingClientRect();
      const left = rect.left + window.scrollX + (viewport?.scrollLeft ?? 0);
      const top = rect.top + window.scrollY + (viewport?.scrollTop ?? 0);

      return {
        left: visible.left - left,
        right: visible.right - left,
        top: visible.top - top,
        bottom: visible.bottom - top,
      };
    };

    // Folded, the side is chosen once, where the selection settled.
    let side: CardSide | null = collapsed ? null : 'center';
    let frameRequest = 0;

    const place = () => {
      frameRequest = 0;

      // The frame waits for its first place until its controller is attached.
      if (frame.hidden) {
        card.style.visibility = 'hidden';

        return;
      }

      side ??= chooseCardSide(readFrameBox(frame), readView(), card.offsetWidth);
      applyCardPlacement(card, getCardPlacement(readFrameBox(frame), readView(), card.offsetWidth, card.offsetHeight, side));
    };

    const schedule = () => {
      frameRequest ||= requestAnimationFrame(place);
    };

    place();

    const frameObserver = new MutationObserver(place);

    // In a page, both the page and the widget's scroller move the visible part.
    frameObserver.observe(frame, { attributes: true, attributeFilter: ['style', 'hidden'] });
    window.addEventListener('scroll', place, { passive: true });
    viewport?.addEventListener('scroll', place, { passive: true });
    window.addEventListener('resize', schedule);

    return () => {
      cancelAnimationFrame(frameRequest);
      frameObserver.disconnect();
      window.removeEventListener('scroll', place);
      viewport?.removeEventListener('scroll', place);
      window.removeEventListener('resize', schedule);
    };
  }, [cardRef, collapsed, frameRef, selectionKey, viewportRef]);
}
