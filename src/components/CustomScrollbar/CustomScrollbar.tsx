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
  scrollStart: number;
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
  mode?: ScrollbarMode;
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
  mode = 'vertical',
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

  const endScrollbarDrag = useCallback(() => {
    if (!scrollbarDragRef.current) {
      return;
    }

    scrollbarDragRef.current = null;
    setIsDraggingScrollbar(false);
  }, []);

  const updateScrollbar = useCallback(() => {
    const content = contentElementRef.current;

    if (!content) {
      return;
    }

    const { clientHeight, clientWidth, scrollHeight, scrollLeft, scrollTop, scrollWidth } = content;
    const verticalVisible = showVerticalScrollbar && scrollHeight > clientHeight;
    const horizontalVisible = showHorizontalScrollbar && scrollWidth > clientWidth;
    const verticalTrackLength = Math.max(clientHeight - SCROLLBAR_VERTICAL_PADDING, 0);
    const horizontalTrackLength = Math.max(clientWidth - SCROLLBAR_HORIZONTAL_PADDING, 0);
    const verticalThumbLength = verticalVisible
      ? Math.max((clientHeight / scrollHeight) * verticalTrackLength, MIN_SCROLLBAR_THUMB_HEIGHT)
      : MIN_SCROLLBAR_THUMB_HEIGHT;
    const horizontalThumbLength = horizontalVisible
      ? Math.max((clientWidth / scrollWidth) * horizontalTrackLength, MIN_SCROLLBAR_THUMB_WIDTH)
      : MIN_SCROLLBAR_THUMB_WIDTH;
    const maxVerticalThumbOffset = verticalTrackLength - verticalThumbLength;
    const maxHorizontalThumbOffset = horizontalTrackLength - horizontalThumbLength;
    const maxScrollTop = scrollHeight - clientHeight;
    const maxScrollLeft = scrollWidth - clientWidth;

    setScrollbars({
      vertical: {
        visible: verticalVisible,
        thumbLength: verticalThumbLength,
        thumbOffset: maxScrollTop > 0 ? (scrollTop / maxScrollTop) * maxVerticalThumbOffset : 0,
      },
      horizontal: {
        visible: horizontalVisible,
        thumbLength: horizontalThumbLength,
        thumbOffset: maxScrollLeft > 0 ? (scrollLeft / maxScrollLeft) * maxHorizontalThumbOffset : 0,
      },
    });
  }, [showHorizontalScrollbar, showVerticalScrollbar]);

  const scrollContentByThumbDelta = useCallback((pointerPosition: number) => {
    const content = contentElementRef.current;
    const drag = scrollbarDragRef.current;

    if (!content || !drag) {
      return;
    }

    const isVertical = drag.axis === 'vertical';
    const { clientHeight, clientWidth, scrollHeight, scrollWidth } = content;
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
    const scrollOffset = drag.scrollStart + (pointerDelta / maxThumbOffset) * maxScrollOffset;

    if (isVertical) {
      content.scrollTop = scrollOffset;
    } else {
      content.scrollLeft = scrollOffset;
    }
  }, [scrollbars]);

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
      scrollStart: axis === 'vertical' ? content.scrollTop : content.scrollLeft,
    };
    setIsDraggingScrollbar(true);
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
