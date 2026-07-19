import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { BUY_ME_A_COFFEE_URL, SITE_NAME } from '../../config';
import { SUPPORTED_LANGUAGES, useI18n } from '../../i18n';
import {
  getCanonicalLanguagePath,
  getLocalizedPathname,
} from '../../i18n/languageRouting';
import type { AppLanguage, TimeFormat } from '../../settings';

type HeaderProps = {
  timeFormat: TimeFormat;
  onTimeFormatButtonClick: () => void;
};

export default function Header({
  timeFormat,
  onTimeFormatButtonClick,
}: HeaderProps) {
  const [isLangSelectorVisible, setIsLangSelectorVisible] = useState(false);
  const { language, setLanguage, t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLangSelectorClick = () => {
    setIsLangSelectorVisible((isVisible) => !isVisible);
  };

  const handleLanguageButtonClick = (nextLanguage: AppLanguage) => {
    setLanguage(nextLanguage);
    setIsLangSelectorVisible(false);
    navigate(getLocalizedPathname(location.pathname, nextLanguage));
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
          {/*
            <a
              href={BUY_ME_A_COFFEE_URL}
              className="headerMenu-item"
              target="_blank"
            >{t('common.buyMeACoffee')}</a>
          */}

          <button type="button" className="headerMenu-item headerMenu-item_ampm" onClick={onTimeFormatButtonClick}>
            {timeFormat === '24h' ? 'AM/PM' : '24H'}
          </button>

          <button type="button" className="headerMenu-item nightMode" />

          <div className="langSelectButtonBox">
            <button
              type="button"
              className="headerMenu-item langSelectButton"
              onClick={handleLangSelectorClick}
            >{t(`languages.${language}`)}</button>

            {isLangSelectorVisible && (
              <div className="langSelectMenu">
                {SUPPORTED_LANGUAGES.map((languageOption) => (
                  <button
                    type="button"
                    className="langSelectMenu-button"
                    key={languageOption}
                    onClick={() => handleLanguageButtonClick(languageOption)}
                  >
                    {t(`languages.${languageOption}`)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
