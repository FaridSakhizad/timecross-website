import { useCallback, useState, useEffect } from 'react';

import useEmblaCarousel from 'embla-carousel-react';

import slide1 from '../../assets/1-cities.jpg';
import slide2 from '../../assets/2-cities.jpg';
import slide3 from '../../assets/3-timelines.jpg';
import slide4 from '../../assets/4-add-city.jpg';
import slide5 from '../../assets/5-add-timezone.jpg';
import slide6 from '../../assets/6-notifications.jpg';

import './style.css';

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

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })

  const scrollPrev = () => {
    emblaApi?.scrollPrev();
  };
  const scrollNext = () => {
    emblaApi?.scrollNext();
  };

  const handleSliderDotButtonClick = useCallback(
    (index: number) => {
      if (!emblaApi) {
        return;
      }

      emblaApi.scrollTo(index);

      setActiveSlideIdx(index);
    },
    [emblaApi]
  )

  useEffect(() => {
    if (!emblaApi) {
      return
    }

    emblaApi.on('select', (emblaApi) => {
      setActiveSlideIdx(emblaApi.selectedScrollSnap());
    });
  }, [emblaApi])

  return (
    <div className="screenshotsSlider">
      <button className="screenshotsSlider-navButton screenshotsSlider-navButton_prev" onClick={scrollPrev}>
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

      <div className="screenshotsSliderBox" ref={emblaRef}>
        <div className="screenshotsSliderContainer">
          {SLIDES.map((item) => {
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

      <button className="screenshotsSlider-navButton screenshotsSlider-navButton_next" onClick={scrollNext}>
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
