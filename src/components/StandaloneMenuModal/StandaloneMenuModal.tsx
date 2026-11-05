import '../Modal/style.css';
import './style.css';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router';

import { BUY_ME_A_COFFEE_URL } from '../../config';
import { useI18n } from '../../i18n';
import {
  getCanonicalLanguagePath,
  getLanguageMenuItems,
  getLocalizedPathname,
  getLanguageLabelKey,
} from '../../i18n/languageRouting';
import type { ColorMode, TimeFormat } from '../../settings';

type StandaloneMenuModalProps = {
  colorMode: ColorMode;
  isOpen: boolean;
  timeFormat: TimeFormat;
  onClose: () => void;
  onColorModeButtonClick: () => void;
  onTimeFormatButtonClick: () => void;
};

export default function StandaloneMenuModal({
  colorMode,
  isOpen,
  timeFormat,
  onClose,
  onColorModeButtonClick,
  onTimeFormatButtonClick,
}: StandaloneMenuModalProps) {
  const [isLangSelectorVisible, setIsLangSelectorVisible] = useState(false);
  const langSelectorRef = useRef<HTMLDivElement>(null);
  const { language, t } = useI18n();
  const location = useLocation();
  const [wasOpen, setWasOpen] = useState(isOpen);

  // Collapse the language list when the modal closes (state adjusted during render, not in an effect).
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);

    if (!isOpen) {
      setIsLangSelectorVisible(false);
    }
  }

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isLangSelectorVisible) {
      return undefined;
    }

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (target instanceof Node && !langSelectorRef.current?.contains(target)) {
        setIsLangSelectorVisible(false);
      }
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown);

    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown);
    };
  }, [isLangSelectorVisible]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      className="appModal standaloneMenuModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="standalone-menu-modal-title"
    >
      <button
        className="appModal-backdrop"
        type="button"
        aria-label={t('common.close')}
        onClick={onClose}
      />

      <div className="appModal-panel standaloneMenuModal-panel">
        <button
          className="appModal-close"
          type="button"
          aria-label={t('common.close')}
          onClick={onClose}
        />

        <div className="standaloneMenuModal-content">
          <a
            href={BUY_ME_A_COFFEE_URL}
            className="standaloneMenuModal-item standaloneMenuModal-item_thanks"
            target="_blank"
          >
            {t('common.sayThanks')}
          </a>

          <Link
            to={getCanonicalLanguagePath(language, '/cities')}
            className="standaloneMenuModal-item"
            onClick={onClose}
          >
            {t('common.citiesLabel')}
          </Link>

          <Link
            to={getCanonicalLanguagePath(language, '/grid')}
            className="standaloneMenuModal-item"
            onClick={onClose}
          >
            {t('common.gridLabel')}
          </Link>

          <Link
            to={getCanonicalLanguagePath(language, '/convert')}
            className="standaloneMenuModal-item"
            onClick={onClose}
          >
            {t('common.timeZoneConverterLabel')}
          </Link>

          <button
            type="button"
            className="standaloneMenuModal-item"
            onClick={onTimeFormatButtonClick}
          >
            {timeFormat === '24h' ? 'AM/PM' : '24H'}
          </button>

          <button
            type="button"
            className={`standaloneMenuModal-item standaloneMenuModal-nightMode ${colorMode === 'night' ? 'isActive' : ''}`}
            onClick={onColorModeButtonClick}
          >
            {t(colorMode === 'night' ? 'common.lightMode' : 'common.darkMode')}
          </button>

          <div
            className="langSelectButtonBox"
            ref={langSelectorRef}
          >
            <button
              type="button"
              className="standaloneMenuModal-item standaloneMenuModal-item_langs"
              onClick={() => setIsLangSelectorVisible((isVisible) => !isVisible)}
            >
              <span className="langSelectButton-shortName">{t(getLanguageLabelKey(language))}</span>
            </button>

            {isLangSelectorVisible && (
              <div className="langSelectMenu standaloneMenuModal-langMenu">
                {getLanguageMenuItems(language).map((menuItem) => (
                  <Link
                    to={getLocalizedPathname(location.pathname, menuItem.language)}
                    className="langSelectMenu-button"
                    key={menuItem.language}
                    onClick={() => {
                      setIsLangSelectorVisible(false);
                      onClose();
                    }}
                  >
                    {t(menuItem.labelKey)}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
