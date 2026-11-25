/**
 * Where the selection card goes, by the frame: the same rule on a desktop and on a phone. Boxes are
 * in one coordinate system, the grid content's; `view` is the visible part of it, below the hour
 * labels.
 */
export type CardBox = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

/** Beside the frame on one side, or in the middle of the view across (on a phone). */
export type CardSide = 'left' | 'right' | 'center';

const GAP = 14;
const EDGE = 8;
/** Room for the card's shadow at the sides when its top or bottom is cut off. */
const SHADOW_ROOM = 48;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, Math.max(min, max)));
}

function readPixels(value: string, fallback: number) {
  const pixels = parseFloat(value);

  return Number.isFinite(pixels) ? pixels : fallback;
}

/**
 * The frame's final box: its inline style. Its measured box is still moving while the selection
 * snaps to whole slots after a drag (an animation from the old box to the new one).
 */
export function readFrameBox(frame: HTMLElement): CardBox {
  const left = readPixels(frame.style.left, frame.offsetLeft);
  const top = readPixels(frame.style.top, frame.offsetTop);

  return {
    left,
    right: left + readPixels(frame.style.width, frame.offsetWidth),
    top,
    bottom: top + readPixels(frame.style.height, frame.offsetHeight),
  };
}

/** Beside the frame on the side with room; on the right, over the frame's edge, when neither has. */
export function chooseCardSide(frame: CardBox, view: CardBox, width: number): Exclude<CardSide, 'center'> {
  const fitsRight = frame.right + GAP + width <= view.right - EDGE;
  const fitsLeft = frame.left - GAP - width >= view.left + EDGE;

  return fitsRight || !fitsLeft ? 'right' : 'left';
}

/**
 * Across, beside the frame (or in the middle of the view) and kept in the view, like `position: sticky`. Down, level with the
 * frame's top; when that is under the hour labels, held there until the frame's bottom pushes the
 * card up and out. The parts over the labels or below the view are cut off, and the card is
 * hidden once the frame has left the view.
 */
export function getCardPlacement(frame: CardBox, view: CardBox, width: number, height: number, side: CardSide) {
  const besideFrame = {
    left: frame.left - GAP - width,
    right: frame.right + GAP,
    center: (view.left + view.right - width) / 2,
  };
  const left = clamp(besideFrame[side], view.left + EDGE, view.right - EDGE - width);
  const top = Math.max(frame.top, Math.min(view.top, frame.bottom - height));
  const cutTop = Math.max(0, view.top - top);
  const cutBottom = Math.max(0, top + height - view.bottom);

  return {
    left,
    top,
    cutTop,
    cutBottom,
    isInView: frame.bottom > view.top && frame.top < view.bottom && cutTop + cutBottom < height,
  };
}

/** Styles the card at `placement`, moved by `offset` into the coordinates of its own box. */
export function applyCardPlacement(
  card: HTMLElement,
  placement: ReturnType<typeof getCardPlacement>,
  offset = { left: 0, top: 0 },
) {
  card.style.left = `${placement.left + offset.left}px`;
  card.style.top = `${placement.top + offset.top}px`;
  card.style.clipPath = placement.cutTop || placement.cutBottom
    ? `inset(${placement.cutTop}px -${SHADOW_ROOM}px ${placement.cutBottom}px)`
    : '';
  card.style.visibility = placement.isInView ? 'visible' : 'hidden';
}
