import './style.css';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { cx } from '../../utils/classNames';

const ANCHOR = '[data-tooltip]';
/** A pause before the first tooltip, so that a pointer passing over buttons does not light them up. */
const SHOW_DELAY = 500;
/** Within this time after a tooltip, the next one shows at once: the user is reading them. */
const WARM_TIME = 400;
const GAP = 8;
const EDGE = 8;
/** The arrow stays clear of the rounded corners. */
const ARROW_INSET = 12;

type TooltipTheme = 'dark' | 'light';

type Placement = {
  side: 'top' | 'bottom';
  left: number;
  top: number;
  arrowLeft: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, Math.max(min, max)));
}

function findAnchor(target: EventTarget | null) {
  return target instanceof Element ? target.closest<HTMLElement>(ANCHOR) : null;
}

/**
 * One tooltip for the whole site: an element with `data-tooltip="…"` gets it on mouse hover and on
 * keyboard focus. Listening on the document, it sees elements that appear later too. It is dark;
 * `data-tooltip-theme="light"` makes it light. The text is plain text, never HTML.
 *
 * The element keeps its own accessible name (aria-label or text): the tooltip only shows that name
 * to the eye and is hidden from screen readers, so they do not hear it twice. It lives in the body,
 * above everything, so no `overflow: hidden` clips it and no `backdrop-filter` or `transform` of a
 * parent (which would become the box of a fixed element) moves it.
 */
export default function Tooltips() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const text = anchor?.dataset.tooltip ?? '';
  const theme: TooltipTheme = anchor?.dataset.tooltipTheme === 'light' ? 'light' : 'dark';

  useEffect(() => {
    let current: HTMLElement | null = null;
    let showTimer = 0;
    let hiddenAt = 0;

    const open = (next: HTMLElement) => {
      window.clearTimeout(showTimer);
      current = next;
      setAnchor(next);
    };

    const hide = () => {
      window.clearTimeout(showTimer);

      if (current) {
        hiddenAt = performance.now();
      }

      current = null;
      setAnchor(null);
    };

    const openSoon = (next: HTMLElement) => {
      if (next === current) {
        return;
      }

      window.clearTimeout(showTimer);

      if (current || performance.now() - hiddenAt < WARM_TIME) {
        open(next);
      } else {
        showTimer = window.setTimeout(() => open(next), SHOW_DELAY);
      }
    };

    const handlePointerOver = (event: PointerEvent) => {
      // A tap is not a hover: on a touch screen the tooltip would stay until the next tap elsewhere.
      if (event.pointerType !== 'mouse') {
        return;
      }

      const next = findAnchor(event.target);

      if (next) {
        openSoon(next);
      }
    };

    const handlePointerOut = (event: PointerEvent) => {
      const left = findAnchor(event.target);

      // Moving onto the anchor's own icon is not leaving it.
      if (left && !(event.relatedTarget instanceof Node && left.contains(event.relatedTarget))) {
        hide();
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      const next = findAnchor(event.target);

      // Keyboard focus only: a click focuses a button too, and the tooltip would stay after it.
      if (next && next.matches(':focus-visible')) {
        open(next);
      }
    };

    const handleFocusOut = (event: FocusEvent) => {
      if (current && findAnchor(event.target) === current) {
        hide();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        hide();
      }
    };

    // Pressing, clicking (by keyboard too) and scrolling anything end the tooltip: what it named
    // has been used, or has moved away from it.
    document.addEventListener('pointerover', handlePointerOver);
    document.addEventListener('pointerout', handlePointerOut);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', hide, true);
    document.addEventListener('click', hide, true);
    window.addEventListener('scroll', hide, { capture: true, passive: true });
    window.addEventListener('resize', hide);
    window.addEventListener('blur', hide);

    return () => {
      window.clearTimeout(showTimer);
      document.removeEventListener('pointerover', handlePointerOver);
      document.removeEventListener('pointerout', handlePointerOut);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', hide, true);
      document.removeEventListener('click', hide, true);
      window.removeEventListener('scroll', hide, { capture: true });
      window.removeEventListener('resize', hide);
      window.removeEventListener('blur', hide);
    };
  }, []);

  // Measured before the paint: above the anchor, or below it without room above; inside the window.
  useLayoutEffect(() => {
    const tooltip = tooltipRef.current;

    if (!anchor || !tooltip || !anchor.isConnected) {
      setPlacement(null);

      return;
    }

    const rect = anchor.getBoundingClientRect();
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    const center = rect.left + rect.width / 2;
    const left = clamp(center - width / 2, EDGE, window.innerWidth - EDGE - width);
    const side = rect.top - GAP - height >= EDGE ? 'top' : 'bottom';

    setPlacement({
      side,
      left,
      top: side === 'top' ? rect.top - GAP - height : rect.bottom + GAP,
      arrowLeft: clamp(center - left, ARROW_INSET, width - ARROW_INSET),
    });
  }, [anchor, text]);

  if (!anchor || !text) {
    return null;
  }

  return createPortal(
    <div
      ref={tooltipRef}
      className={cx(
        'tooltip',
        `tooltip_${theme}`,
        placement && `tooltip_${placement.side}`,
      )}
      style={placement ? { left: placement.left, top: placement.top } : undefined}
      aria-hidden="true"
    >
      {text}
      <span
        className="tooltip-arrow"
        style={placement ? { left: placement.arrowLeft } : undefined}
      />
    </div>,
    document.body,
  );
}
