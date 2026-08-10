import './style.css';

import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';

import { SITE_NAME, BUY_ME_A_COFFEE_URL } from '../../config';
import { SUPPORTED_LANGUAGES, useI18n } from '../../i18n';
import {
  getCanonicalLanguagePath,
  getLocalizedPathname,
} from '../../i18n/languageRouting';
import type { AppLanguage, ColorMode, TimeFormat } from '../../settings';

type HeaderProps = {
  colorMode: ColorMode;
  timeFormat: TimeFormat;
  onColorModeButtonClick: () => void;
  onTimeFormatButtonClick: () => void;
};

const SHORT_LANGUAGE_NAMES: Record<AppLanguage, string> = {
  en: 'En',
  fr: 'Fr',
  uk: 'Укр',
  ru: 'Ру',
  es: 'Es',
  pt: 'Pt',
  de: 'De',
};

export default function Header({
  colorMode,
  timeFormat,
  onColorModeButtonClick,
  onTimeFormatButtonClick,
}: HeaderProps) {
  const [isLangSelectorVisible, setIsLangSelectorVisible] = useState(false);
  const langSelectorRef = useRef<HTMLDivElement>(null);
  const { language, t } = useI18n();
  const location = useLocation();

  useEffect(() => {
    if (!isLangSelectorVisible) {
      return undefined;
    }

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (
        target instanceof Node &&
        !langSelectorRef.current?.contains(target)
      ) {
        setIsLangSelectorVisible(false);
      }
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown);

    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown);
    };
  }, [isLangSelectorVisible]);

  const handleLangSelectorClick = () => {
    setIsLangSelectorVisible((isVisible) => !isVisible);
  };

  return (
    <header className="header">
      <div className="container container_header">
        <Link
          to={getCanonicalLanguagePath(language)}
          className="logo"
          title={`${SITE_NAME} | Prod`}
        >
          <span className="logo-name">{SITE_NAME}</span>
          <span className="logo-pitch">{t('common.sitePitch')}</span>
        </Link>

        <div className="headerMenu">
          <a
            href={BUY_ME_A_COFFEE_URL}
            className="headerMenu-item headerMenu-item_thanks"
            target="_blank"
          >{t('common.sayThanks')}</a>

          <button type="button" className="headerMenu-item headerMenu-item_ampm" onClick={onTimeFormatButtonClick}>
            {timeFormat === '24h' ? 'AM/PM' : '24H'}
          </button>

          <button
            type="button"
            className={`headerMenu-item headerMenu-item_nightMode ${colorMode === 'night' ? 'isActive' : ''}`}
            aria-label="Night mode"
            onClick={onColorModeButtonClick}
          />

          <div className="langSelectButtonBox" ref={langSelectorRef}>
            <button
              type="button"
              className="headerMenu-item langSelectButton"
              onClick={handleLangSelectorClick}
            >
              <span className="langSelectButton-name">{t(`languages.${language}`)}</span>
              <span className="langSelectButton-shortName">{SHORT_LANGUAGE_NAMES[language]}</span>
            </button>

            {isLangSelectorVisible && (
              <div className="langSelectMenu">
                {SUPPORTED_LANGUAGES.filter((languageOption) => languageOption !== language).map((languageOption) => (
                  <Link
                    to={getLocalizedPathname(location.pathname, languageOption)}
                    className="langSelectMenu-button"
                    key={languageOption}
                    onClick={() => setIsLangSelectorVisible(false)}
                  >
                    {t(`languages.${languageOption}`)}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
