import { useLayoutEffect, type RefObject } from 'react';

import {
  applyCardPlacement,
  chooseCardSide,
  getCardPlacement,
  readFrameBox,
  type CardBox,
  type CardSide,
} from '../shared/selectionCardPlacement';

/** The hour labels at the top of the grid stay visible above the card. */
const TOP_INSET = 50;

/**
 * Keeps the selection card by the frame (see getCardPlacement), also while an edge of the frame is
 * dragged.
 *
 * The card lives outside the scrolling viewport, in the still box around it. Inside, selecting the
 * card's text and dragging towards an edge made the browser scroll the viewport, the card followed
 * to the edge, and the browser scrolled again: the grid ran away to its end. So the place is worked
 * out in the grid content's coordinates and then moved into the still box's, on every scroll.
 * React does not style the card.
 */
export function useSelectionCardPosition(
  viewportRef: RefObject<HTMLDivElement | null>,
  frameRef: RefObject<HTMLDivElement | null>,
  cardRef: RefObject<HTMLDivElement | null>,
  /** Changes whenever the selection settles somewhere else; empty without a card. */
  selectionKey: string,
) {
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const frame = frameRef.current;
    const card = cardRef.current;
    const box = card?.offsetParent;

    if (!selectionKey || !viewport || !frame || !card || !(box instanceof HTMLElement)) {
      return undefined;
    }

    const readView = (): CardBox => ({
      left: viewport.scrollLeft,
      right: viewport.scrollLeft + viewport.clientWidth,
      top: viewport.scrollTop + TOP_INSET,
      bottom: viewport.scrollTop + viewport.clientHeight,
    });

    // The side is chosen once, where the selection settled: scrolling and dragging an edge only
    // move the card along.
    let side: CardSide | null = null;
    let frameRequest = 0;

    const place = () => {
      frameRequest = 0;

      // The frame may still be waiting for its first place (a shared meeting's selection, say).
      if (frame.hidden) {
        card.style.visibility = 'hidden';

        return;
      }

      side ??= chooseCardSide(readFrameBox(frame), readView(), card.offsetWidth);

      // Where the content's top left corner is in the still box right now.
      const viewportRect = viewport.getBoundingClientRect();
      const boxRect = box.getBoundingClientRect();

      applyCardPlacement(card, getCardPlacement(readFrameBox(frame), readView(), card.offsetWidth, card.offsetHeight, side), {
        left: viewportRect.left - boxRect.left - box.clientLeft - viewport.scrollLeft,
        top: viewportRect.top - boxRect.top - box.clientTop - viewport.scrollTop,
      });
    };

    const schedule = () => {
      frameRequest ||= requestAnimationFrame(place);
    };

    place();

    // Placed at once, not on the next frame: the card is not carried by the scroll, so a frame late
    // would leave it trailing behind the selection.
    const frameObserver = new MutationObserver(place);

    frameObserver.observe(frame, { attributes: true, attributeFilter: ['style', 'hidden'] });
    viewport.addEventListener('scroll', place, { passive: true });
    window.addEventListener('resize', schedule);

    return () => {
      cancelAnimationFrame(frameRequest);
      frameObserver.disconnect();
      viewport.removeEventListener('scroll', place);
      window.removeEventListener('resize', schedule);
    };
  }, [cardRef, frameRef, selectionKey, viewportRef]);
}
