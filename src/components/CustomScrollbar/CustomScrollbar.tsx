import './style.css';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
  type WheelEvent,
} from 'react';

const MIN_SCROLLBAR_THUMB_HEIGHT = 28;
const MIN_SCROLLBAR_THUMB_WIDTH = 28;
const SCROLLBAR_VERTICAL_PADDING = 8;
const SCROLLBAR_HORIZONTAL_PADDING = 8;

type ScrollbarAxis = 'vertical' | 'horizontal';

type ScrollbarMode = ScrollbarAxis | 'both';

type ScrollbarDrag = {
  pointerId: number;
  axis: ScrollbarAxis;
  pointerStart: number;
  thumbStart: number;
};

type CustomScrollbarMetrics = {
  centerScrollOffset?: number;
  maxScrollOffset?: number;
  minScrollOffset?: number;
  thumbLength?: number;
};

type ScrollbarState = {
  visible: boolean;
  thumbLength: number;
  thumbOffset: number;
};

type ScrollbarsState = {
  vertical: ScrollbarState;
  horizontal: ScrollbarState;
};

type CustomScrollbarProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  contentRef?: (element: HTMLDivElement | null) => void;
  getScrollbarMetrics?: (
    axis: ScrollbarAxis,
    content: HTMLDivElement,
  ) => CustomScrollbarMetrics | undefined;
  mode?: ScrollbarMode;
  onThumbDragEnd?: (axis: ScrollbarAxis) => void;
  onThumbDragStart?: (axis: ScrollbarAxis) => void;
};

const initialScrollbarsState: ScrollbarsState = {
  vertical: {
    visible: false,
    thumbLength: MIN_SCROLLBAR_THUMB_HEIGHT,
    thumbOffset: 0,
  },
  horizontal: {
    visible: false,
    thumbLength: MIN_SCROLLBAR_THUMB_WIDTH,
    thumbOffset: 0,
  },
};

export default function CustomScrollbar({
  children,
  className = '',
  contentClassName = '',
  contentRef,
  getScrollbarMetrics,
  mode = 'vertical',
  onThumbDragEnd,
  onThumbDragStart,
}: CustomScrollbarProps) {
  const contentElementRef = useRef<HTMLDivElement>(null);
  const scrollbarDragRef = useRef<ScrollbarDrag | null>(null);
  const [scrollbars, setScrollbars] = useState<ScrollbarsState>(initialScrollbarsState);
  const [isDraggingScrollbar, setIsDraggingScrollbar] = useState(false);
  const showVerticalScrollbar = mode === 'vertical' || mode === 'both';
  const showHorizontalScrollbar = mode === 'horizontal' || mode === 'both';

  const setContentRef = useCallback((element: HTMLDivElement | null) => {
    contentElementRef.current = element;
    contentRef?.(element);
  }, [contentRef]);

  const getThumbOffset = useCallback((
    scrollOffset: number,
    minScrollOffset: number,
    centerScrollOffset: number | undefined,
    maxScrollOffset: number,
    maxThumbOffset: number,
  ) => {
    if (maxThumbOffset <= 0 || maxScrollOffset <= minScrollOffset) {
      return 0;
    }

    const clampedScrollOffset = Math.max(minScrollOffset, Math.min(maxScrollOffset, scrollOffset));

    if (
      centerScrollOffset !== undefined
      && centerScrollOffset > minScrollOffset
      && centerScrollOffset < maxScrollOffset
    ) {
      const centerThumbOffset = maxThumbOffset / 2;

      if (clampedScrollOffset <= centerScrollOffset) {
        return ((clampedScrollOffset - minScrollOffset) / (centerScrollOffset - minScrollOffset))
          * centerThumbOffset;
      }

      return centerThumbOffset
        + ((clampedScrollOffset - centerScrollOffset) / (maxScrollOffset - centerScrollOffset))
        * centerThumbOffset;
    }

    return ((clampedScrollOffset - minScrollOffset) / (maxScrollOffset - minScrollOffset))
      * maxThumbOffset;
  }, []);

  const getScrollOffset = useCallback((
    thumbOffset: number,
    minScrollOffset: number,
    centerScrollOffset: number | undefined,
    maxScrollOffset: number,
    maxThumbOffset: number,
  ) => {
    if (maxThumbOffset <= 0 || maxScrollOffset <= minScrollOffset) {
      return minScrollOffset;
    }

    const clampedThumbOffset = Math.max(0, Math.min(maxThumbOffset, thumbOffset));

    if (
      centerScrollOffset !== undefined
      && centerScrollOffset > minScrollOffset
      && centerScrollOffset < maxScrollOffset
    ) {
      const centerThumbOffset = maxThumbOffset / 2;

      if (clampedThumbOffset <= centerThumbOffset) {
        return minScrollOffset
          + (clampedThumbOffset / centerThumbOffset) * (centerScrollOffset - minScrollOffset);
      }

      return centerScrollOffset
        + ((clampedThumbOffset - centerThumbOffset) / centerThumbOffset)
        * (maxScrollOffset - centerScrollOffset);
    }

    return minScrollOffset
      + (clampedThumbOffset / maxThumbOffset) * (maxScrollOffset - minScrollOffset);
  }, []);

  const endScrollbarDrag = useCallback(() => {
    const drag = scrollbarDragRef.current;

    if (!drag) {
      return;
    }

    scrollbarDragRef.current = null;
    setIsDraggingScrollbar(false);
    onThumbDragEnd?.(drag.axis);
  }, [onThumbDragEnd]);

  const updateScrollbar = useCallback(() => {
    const content = contentElementRef.current;

    if (!content) {
      return;
    }

    const { clientHeight, clientWidth, scrollHeight, scrollLeft, scrollTop, scrollWidth } = content;
    content.style.setProperty('--custom-scrollbar-client-width', `${clientWidth}px`);
    const verticalVisible = showVerticalScrollbar && scrollHeight > clientHeight;
    const horizontalVisible = showHorizontalScrollbar && scrollWidth > clientWidth;
    const verticalMetrics = getScrollbarMetrics?.('vertical', content);
    const horizontalMetrics = getScrollbarMetrics?.('horizontal', content);
    const verticalTrackLength = Math.max(clientHeight - SCROLLBAR_VERTICAL_PADDING, 0);
    const horizontalTrackLength = Math.max(clientWidth - SCROLLBAR_HORIZONTAL_PADDING, 0);
    const verticalThumbLength = verticalVisible
      ? Math.min(
        verticalTrackLength,
        Math.max(
          verticalMetrics?.thumbLength ?? (clientHeight / scrollHeight) * verticalTrackLength,
          MIN_SCROLLBAR_THUMB_HEIGHT,
        ),
      )
      : MIN_SCROLLBAR_THUMB_HEIGHT;
    const horizontalThumbLength = horizontalVisible
      ? Math.min(
        horizontalTrackLength,
        Math.max(
          horizontalMetrics?.thumbLength ?? (clientWidth / scrollWidth) * horizontalTrackLength,
          MIN_SCROLLBAR_THUMB_WIDTH,
        ),
      )
      : MIN_SCROLLBAR_THUMB_WIDTH;
    const maxVerticalThumbOffset = verticalTrackLength - verticalThumbLength;
    const maxHorizontalThumbOffset = horizontalTrackLength - horizontalThumbLength;
    const maxScrollTop = scrollHeight - clientHeight;
    const maxScrollLeft = scrollWidth - clientWidth;
    const minVerticalScrollOffset = verticalMetrics?.minScrollOffset ?? 0;
    const maxVerticalScrollOffset = verticalMetrics?.maxScrollOffset ?? maxScrollTop;
    const minHorizontalScrollOffset = horizontalMetrics?.minScrollOffset ?? 0;
    const maxHorizontalScrollOffset = horizontalMetrics?.maxScrollOffset ?? maxScrollLeft;

    setScrollbars({
      vertical: {
        visible: verticalVisible,
        thumbLength: verticalThumbLength,
        thumbOffset: getThumbOffset(
          scrollTop,
          minVerticalScrollOffset,
          verticalMetrics?.centerScrollOffset,
          maxVerticalScrollOffset,
          maxVerticalThumbOffset,
        ),
      },
      horizontal: {
        visible: horizontalVisible,
        thumbLength: horizontalThumbLength,
        thumbOffset: getThumbOffset(
          scrollLeft,
          minHorizontalScrollOffset,
          horizontalMetrics?.centerScrollOffset,
          maxHorizontalScrollOffset,
          maxHorizontalThumbOffset,
        ),
      },
    });
  }, [
    getScrollbarMetrics,
    getThumbOffset,
    showHorizontalScrollbar,
    showVerticalScrollbar,
  ]);

  const scrollContentByThumbDelta = useCallback((pointerPosition: number) => {
    const content = contentElementRef.current;
    const drag = scrollbarDragRef.current;

    if (!content || !drag) {
      return;
    }

    const isVertical = drag.axis === 'vertical';
    const { clientHeight, clientWidth, scrollHeight, scrollWidth } = content;
    const metrics = getScrollbarMetrics?.(drag.axis, content);
    const trackLength = Math.max(
      isVertical ? clientHeight - SCROLLBAR_VERTICAL_PADDING : clientWidth - SCROLLBAR_HORIZONTAL_PADDING,
      0,
    );
    const thumbLength = scrollbars[drag.axis].thumbLength;
    const maxThumbOffset = trackLength - thumbLength;
    const maxScrollOffset = isVertical ? scrollHeight - clientHeight : scrollWidth - clientWidth;

    if (maxThumbOffset <= 0 || maxScrollOffset <= 0) {
      return;
    }

    const pointerDelta = pointerPosition - drag.pointerStart;
    const minScrollOffset = metrics?.minScrollOffset ?? 0;
    const scrollOffset = getScrollOffset(
      drag.thumbStart + pointerDelta,
      minScrollOffset,
      metrics?.centerScrollOffset,
      metrics?.maxScrollOffset ?? maxScrollOffset,
      maxThumbOffset,
    );

    if (isVertical) {
      content.scrollTop = scrollOffset;
    } else {
      content.scrollLeft = scrollOffset;
    }
  }, [getScrollOffset, getScrollbarMetrics, scrollbars]);

  const handleScrollbarThumbPointerDown = (axis: ScrollbarAxis) => (event: PointerEvent<HTMLSpanElement>) => {
    const content = contentElementRef.current;

    if (!content) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    scrollbarDragRef.current = {
      pointerId: event.pointerId,
      axis,
      pointerStart: axis === 'vertical' ? event.clientY : event.clientX,
      thumbStart: scrollbars[axis].thumbOffset,
    };
    setIsDraggingScrollbar(true);
    onThumbDragStart?.(axis);
  };

  const handleScrollbarThumbPointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    const drag = scrollbarDragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    if (event.buttons === 0) {
      endScrollbarDrag();
      return;
    }

    scrollContentByThumbDelta(drag.axis === 'vertical' ? event.clientY : event.clientX);
  };

  const handleScrollbarThumbPointerUp = (event: PointerEvent<HTMLSpanElement>) => {
    if (scrollbarDragRef.current?.pointerId !== event.pointerId) {
      return;
    }

    endScrollbarDrag();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleScrollbarWheel = (axis: ScrollbarAxis) => (event: WheelEvent<HTMLDivElement>) => {
    const content = contentElementRef.current;

    if (!content) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (axis === 'vertical') {
      content.scrollTop += event.deltaY;
      content.scrollLeft += event.deltaX;
    } else {
      content.scrollLeft += event.deltaX || event.deltaY;
    }

    updateScrollbar();
  };

  useEffect(() => {
    const frameId = requestAnimationFrame(updateScrollbar);
    const content = contentElementRef.current;

    if (!content) {
      return () => cancelAnimationFrame(frameId);
    }

    const resizeObserver = new ResizeObserver(updateScrollbar);

    resizeObserver.observe(content);
    resizeObserver.observe(document.documentElement);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [updateScrollbar]);

  useEffect(() => {
    if (!isDraggingScrollbar) {
      return;
    }

    const handleWindowPointerUp = (event: globalThis.PointerEvent) => {
      if (scrollbarDragRef.current?.pointerId !== event.pointerId) {
        return;
      }

      endScrollbarDrag();
    };

    const handleWindowBlur = () => {
      endScrollbarDrag();
    };

    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [endScrollbarDrag, isDraggingScrollbar]);

  return (
    <div className={`customScrollbar ${className}`}>
      <div
        className={`customScrollbar-content ${contentClassName}`}
        ref={setContentRef}
        onScroll={updateScrollbar}
      >
        {children}
      </div>
      {scrollbars.vertical.visible && (
        <div
          className="customScrollbar-track customScrollbar-track_vertical"
          aria-hidden="true"
          onWheel={handleScrollbarWheel('vertical')}
        >
          <span
            className={`customScrollbar-thumb customScrollbar-thumb_vertical ${
              isDraggingScrollbar ? 'customScrollbar-thumb_dragging' : ''
            }`}
            style={{
              height: `${scrollbars.vertical.thumbLength}px`,
              transform: `translate3d(0, ${scrollbars.vertical.thumbOffset}px, 0)`,
            }}
            onPointerDown={handleScrollbarThumbPointerDown('vertical')}
            onPointerMove={handleScrollbarThumbPointerMove}
            onPointerUp={handleScrollbarThumbPointerUp}
            onPointerCancel={handleScrollbarThumbPointerUp}
          />
        </div>
      )}
      {scrollbars.horizontal.visible && (
        <div
          className="customScrollbar-track customScrollbar-track_horizontal"
          aria-hidden="true"
          onWheel={handleScrollbarWheel('horizontal')}
        >
          <span
            className={`customScrollbar-thumb customScrollbar-thumb_horizontal ${
              isDraggingScrollbar ? 'customScrollbar-thumb_dragging' : ''
            }`}
            style={{
              width: `${scrollbars.horizontal.thumbLength}px`,
              transform: `translate3d(${scrollbars.horizontal.thumbOffset}px, 0, 0)`,
            }}
            onPointerDown={handleScrollbarThumbPointerDown('horizontal')}
            onPointerMove={handleScrollbarThumbPointerMove}
            onPointerUp={handleScrollbarThumbPointerUp}
            onPointerCancel={handleScrollbarThumbPointerUp}
          />
        </div>
      )}
    </div>
  );
}
