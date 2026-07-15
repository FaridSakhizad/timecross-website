import './style.css';
import { useEffect, useState } from 'react';

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

export default function ScreenshotSlider() {
  const [ activeSlideIdx, setActiveSlideIdx ] = useState<number>(0);
  const [ lockSlideAnimation, setLockSlideAnimation ] = useState<boolean>(false);
  const [ isAnimating, setIsAnimating ] = useState<boolean>(false);

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
      <button className="screenshotsSlider-navButton" onClick={handleLeftSliderButtonClick} />

      <div className="screenshotsSliderBox">

        <div className="sliderFrame">
          <div
            className={`sliderWrapper ${lockSlideAnimation ? 'sliderWrapper_lockSlideAnimation' : ''}`} // @ts-expect-error
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

      <button className="screenshotsSlider-navButton" onClick={handleRightSliderButtonClick} />

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
