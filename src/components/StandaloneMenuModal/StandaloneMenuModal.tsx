import './style.css';

import { Link } from 'react-router';

import { BUY_ME_A_COFFEE_URL } from '../../config';
import { usePreferences } from '../../hooks/usePreferences';
import { useI18n } from '../../i18n';
import { getCanonicalLanguagePath, getLanguageLabelKey } from '../../i18n/languageRouting';
import { PAGES } from '../../routes';
import { cx } from '../../utils/classNames';
import LanguageMenu from '../LanguageMenu';
import Modal from '../Modal';

type StandaloneMenuModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function StandaloneMenuModal({
  isOpen,
  onClose,
}: StandaloneMenuModalProps) {
  const {
    colorMode,
    timeFormat,
    toggleColorMode,
    toggleTimeFormat,
  } = usePreferences();
  const { language, t } = useI18n();

  return (
    <Modal
      isOpen={isOpen}
      className="standaloneMenuModal"
      label={t('common.menu')}
      onClose={onClose}
    >
      <div className="standaloneMenuModal-content">
        <a
          href={BUY_ME_A_COFFEE_URL}
          className="standaloneMenuModal-item standaloneMenuModal-item_thanks"
          target="_blank"
        >
          {t('common.sayThanks')}
        </a>

        <Link
          to={getCanonicalLanguagePath(language, PAGES.cities.path)}
          className="standaloneMenuModal-item"
          onClick={onClose}
        >
          {t('common.citiesLabel')}
        </Link>

        <Link
          to={getCanonicalLanguagePath(language, PAGES.grid.path)}
          className="standaloneMenuModal-item"
          onClick={onClose}
        >
          {t('common.gridLabel')}
        </Link>

        <Link
          to={getCanonicalLanguagePath(language, PAGES.convert.path)}
          className="standaloneMenuModal-item"
          onClick={onClose}
        >
          {t('common.timeZoneConverterLabel')}
        </Link>

        <button
          type="button"
          className="standaloneMenuModal-item"
          onClick={toggleTimeFormat}
        >
          {timeFormat === '24h' ? 'AM/PM' : '24H'}
        </button>

        <button
          type="button"
          className={cx('standaloneMenuModal-item standaloneMenuModal-item_nightMode', colorMode === 'night' && 'isActive')}
          onClick={toggleColorMode}
        >
          {t(colorMode === 'night' ? 'common.lightMode' : 'common.darkMode')}
        </button>

        <LanguageMenu
          buttonClassName="standaloneMenuModal-item standaloneMenuModal-item_langs"
          buttonLabel={t(getLanguageLabelKey(language))}
          menuClassName="standaloneMenuModal-langMenu"
          onSelect={onClose}
        />
      </div>
    </Modal>
  );
}
