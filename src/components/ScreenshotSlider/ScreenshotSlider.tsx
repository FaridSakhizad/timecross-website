import './style.css';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { useI18n } from '../../i18n';

import slide1 from '../../assets/1-cities.jpg';
import slide2 from '../../assets/2-cities.jpg';
import slide3 from '../../assets/3-timelines.jpg';
import slide4 from '../../assets/4-add-city.jpg';
import slide5 from '../../assets/5-add-timezone.jpg';
import slide6 from '../../assets/6-notifications.jpg';

const SLIDES = [
  {
    id: 1,
    img: slide1,
    alt: '',
  },
  {
    id: 2,
    img: slide2,
    alt: '',
  },
  {
    id: 3,
    img: slide3,
    alt: '',
  },
  {
    id: 4,
    img: slide4,
    alt: '',
  },
  {
    id: 5,
    img: slide5,
    alt: '',
  },
  {
    id: 6,
    img: slide6,
    alt: '',
  }
];

const SWIPE_MIN_DISTANCE = 48;
const SWIPE_AXIS_BIAS = 1.2;

type SwipeState = {
  axis: 'pending' | 'horizontal' | 'vertical';
  pointerId: number;
  startX: number;
  startY: number;
};

export default function ScreenshotSlider() {
  const { t } = useI18n();
  const [ activeSlideIdx, setActiveSlideIdx ] = useState<number>(0);
  const [ lockSlideAnimation, setLockSlideAnimation ] = useState<boolean>(false);
  const [ isAnimating, setIsAnimating ] = useState<boolean>(false);
  const swipeStateRef = useRef<SwipeState | null>(null);

  const [ loopPerformed, setLoopPerformed ] = useState<boolean>(false);

  const handleSliderDotButtonClick = (index: number) => {
    let newActiveSlideIdx = index;

    if (newActiveSlideIdx < 0) {
      newActiveSlideIdx = 0;
    }

    if (newActiveSlideIdx > SLIDES.length) {
      newActiveSlideIdx = SLIDES.length;
    }

    setActiveSlideIdx(newActiveSlideIdx);
  }

  const handleLeftSliderButtonClick = () => {
    if (isAnimating) {
      return;
    }

    setIsAnimating(true);

    setActiveSlideIdx(activeSlideIdx - 1);
  }

  const handleRightSliderButtonClick = () => {
    if (isAnimating) {
      return;
    }

    setIsAnimating(true);

    setActiveSlideIdx(1 + activeSlideIdx);
  }

  const resolveSwipeAxis = (swipeState: SwipeState, clientX: number, clientY: number) => {
    if (swipeState.axis !== 'pending') {
      return swipeState.axis;
    }

    const distanceX = clientX - swipeState.startX;
    const distanceY = clientY - swipeState.startY;
    const absX = Math.abs(distanceX);
    const absY = Math.abs(distanceY);

    if (absX < SWIPE_MIN_DISTANCE && absY < SWIPE_MIN_DISTANCE) {
      return 'pending';
    }

    if (absX >= SWIPE_MIN_DISTANCE && absX >= absY * SWIPE_AXIS_BIAS) {
      return 'horizontal';
    }

    if (absY >= SWIPE_MIN_DISTANCE && absY >= absX * SWIPE_AXIS_BIAS) {
      return 'vertical';
    }

    return 'pending';
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' || !event.isPrimary || isAnimating) {
      return;
    }

    swipeStateRef.current = {
      axis: 'pending',
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const swipeState = swipeStateRef.current;

    if (!swipeState || swipeState.pointerId !== event.pointerId) {
      return;
    }

    swipeState.axis = resolveSwipeAxis(swipeState, event.clientX, event.clientY);

    if (swipeState.axis !== 'horizontal') {
      return;
    }

    event.preventDefault();

    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  const finishSwipe = (event: PointerEvent<HTMLDivElement>) => {
    const swipeState = swipeStateRef.current;

    if (!swipeState || swipeState.pointerId !== event.pointerId) {
      return;
    }

    swipeStateRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const axis = resolveSwipeAxis(swipeState, event.clientX, event.clientY);

    if (axis !== 'horizontal' || isAnimating) {
      return;
    }

    const distanceX = event.clientX - swipeState.startX;

    if (Math.abs(distanceX) < SWIPE_MIN_DISTANCE) {
      return;
    }

    if (distanceX > 0) {
      handleLeftSliderButtonClick();
      return;
    }

    handleRightSliderButtonClick();
  }

  const cancelSwipe = (event: PointerEvent<HTMLDivElement>) => {
    if (swipeStateRef.current?.pointerId !== event.pointerId) {
      return;
    }

    swipeStateRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const loopBack = () => {
    setLockSlideAnimation(true);
    setActiveSlideIdx(SLIDES.length - 1);

    setLoopPerformed(true);
  }

  const loopForward = () => {
    setLockSlideAnimation(true);
    setActiveSlideIdx(0);

    setLoopPerformed(true);
  }

  const handleAnimationEnd = () => {
    setIsAnimating(false);

    if (activeSlideIdx > SLIDES.length - 1) {
      loopForward();
    }

    if (activeSlideIdx < 0) {
      loopBack();
    }
  }

  useEffect(() => {
    if (loopPerformed) {
      setLockSlideAnimation(false);
      setLoopPerformed(false);
    }
  }, [loopPerformed]);

  const getPreSlides = () => {
    return SLIDES.slice(SLIDES.length - 2, SLIDES.length + 1);
  }

  const getPostSlides = () => {
    return SLIDES.slice(0, 2);
  }

  return (
    <div className="screenshotsSlider">
      <button
        type="button"
        className="screenshotsSlider-navButton screenshotsSlider-navButton_prev"
        aria-label={t('common.previousScreenshot')}
        onClick={handleLeftSliderButtonClick}
      >
        <svg
          className="screenshotsSlider-navIcon"
          width="48"
          height="48"
          viewBox="0 0 48 48"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M27 14l-10 10 10 10" />
        </svg>
      </button>

      <div className="screenshotsSliderBox">

        <div
          className="sliderFrame"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishSwipe}
          onPointerCancel={cancelSwipe}
        >
          <div
            className={`sliderWrapper ${lockSlideAnimation ? 'sliderWrapper_lockSlideAnimation' : ''}`} // @ts-expect-error CSS custom property
            style={{ '--active-slide-idx': activeSlideIdx }}
            data-slider-index={activeSlideIdx}
            onTransitionEnd={handleAnimationEnd}
          >
            <div className="sliderWrapperPre">
              {getPreSlides().map((item) => {
                return (
                  <div key={item.id} id={`${item.id}`} className="screenshotsSlider-item">
                    <div className="screenshotsSlider-imageBox">
                      <img className="screenshotsSlider-image" src={item.img} alt={item.alt} />
                    </div>
                  </div>
                )
              })}
            </div>

            {SLIDES.map((item) => {
              return (
                <div key={item.id} id={`${item.id}`} className="screenshotsSlider-item">
                  <div className="screenshotsSlider-imageBox">
                    <img className="screenshotsSlider-image" src={item.img} alt={item.alt} />
                  </div>
                </div>
              )
            })}

            <div className="sliderWrapperPost">
              {getPostSlides().map((item) => {
                return (
                  <div key={item.id} id={`${item.id}`} className="screenshotsSlider-item">
                    <div className="screenshotsSlider-imageBox">
                      <img className="screenshotsSlider-image" src={item.img} alt={item.alt} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="screenshotsSlider-navButton screenshotsSlider-navButton_next"
        aria-label={t('common.nextScreenshot')}
        onClick={handleRightSliderButtonClick}
      >
        <svg
          className="screenshotsSlider-navIcon"
          width="48"
          height="48"
          viewBox="0 0 48 48"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M21 14l10 10-10 10" />
        </svg>
      </button>

      <div className="screenshotsSliderPagination">
        {SLIDES.map((_, idx) => {
          return (
            <button
              key={idx}
              className={`screenshotsSlider-dot ${activeSlideIdx === idx ? 'active' : ''}`}
              onClick={() => handleSliderDotButtonClick(idx)}
            />
          )
        })}
      </div>
    </div>
  )
}
