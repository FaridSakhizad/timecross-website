import './style.css';

import { useState } from 'react';
import { Link } from 'react-router';

import { SITE_NAME, BUY_ME_A_COFFEE_URL } from '../../config';
import { usePreferences } from '../../hooks/usePreferences';
import { useI18n } from '../../i18n';
import { SHORT_LANGUAGE_NAMES } from '../../i18n/languageLabels';
import { getCanonicalLanguagePath } from '../../i18n/languageRouting';
import { PAGES } from '../../routes';
import { cx } from '../../utils/classNames';
import LanguageMenu from '../LanguageMenu';
import StandaloneMenuModal from '../StandaloneMenuModal';

type HeaderProps = {
  customClassNames?: string;
};

export default function Header({
  customClassNames,
}: HeaderProps) {
  const {
    colorMode,
    timeFormat,
    toggleColorMode,
    toggleTimeFormat,
  } = usePreferences();
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const { language, t } = useI18n();

  return (
    <header className={cx('header', customClassNames)}>
      <div className="container">
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
          >
            {t('common.sayThanks')}
          </a>

          <i className="headerMenu-separator headerMenu-separator_1" />

          <Link
            to={getCanonicalLanguagePath(language, PAGES.worldClock.path)}
            className="headerMenu-item headerMenu-item_link"
          >
            {t('common.worldClockLabel')}
          </Link>

          <Link
            to={getCanonicalLanguagePath(language, PAGES.meetingTimePlanner.path)}
            className="headerMenu-item headerMenu-item_link"
          >
            {t('common.meetingPlannerLabel')}
          </Link>

          <Link
            to={getCanonicalLanguagePath(language, PAGES.timeZoneConverter.path)}
            className="headerMenu-item headerMenu-item_link"
          >
            {t('common.timeZoneConverterLabel')}
          </Link>

          <i className="headerMenu-separator headerMenu-separator_2" />

          <button
            type="button"
            className="headerMenu-item headerMenu-item_ampm"
            onClick={toggleTimeFormat}
          >
            {timeFormat === '24h' ? 'AM/PM' : '24H'}
          </button>

          <button
            type="button"
            className={cx('headerMenu-item headerMenu-item_nightMode', colorMode === 'night' && 'isActive')}
            aria-label={t(colorMode === 'night' ? 'common.lightMode' : 'common.darkMode')}
            onClick={toggleColorMode}
          />

          <LanguageMenu
            buttonClassName="headerMenu-item langSelectButton"
            buttonLabel={SHORT_LANGUAGE_NAMES[language]}
          />

          <button
            type="button"
            className="headerMenu-item headerMenu-item_menu"
            aria-label={t('common.menu')}
            aria-haspopup="dialog"
            aria-expanded={isMenuModalOpen}
            onClick={() => setIsMenuModalOpen(true)}
          />
        </div>
      </div>
      <StandaloneMenuModal
        isOpen={isMenuModalOpen}
        onClose={() => setIsMenuModalOpen(false)}
      />
    </header>
  );
}
