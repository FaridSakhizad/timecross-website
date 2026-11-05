import '../../widgetHeaderButtons.css';
import { useState } from 'react';
import { Link } from 'react-router';

import { useI18n } from '../../../i18n';
import { getCanonicalLanguagePath } from '../../../i18n/languageRouting';
import { PAGES } from '../../../routes';
import { cx } from '../../../utils/classNames';
import StandaloneMenuModal from '../../StandaloneMenuModal';
import type { GridToolbarProps } from '../shared/types';

import { type MobileSelectionControlsProps } from './MobileSelectionControls';

type MobileToolbarProps = GridToolbarProps & MobileSelectionControlsProps;

export default function MobileToolbar({
  isEditMode,
  onAddCityClick,
  onEditModeToggle,
  onResetClick,
  presentation,
}: MobileToolbarProps) {
  const { language, t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const embedded = presentation === 'embedded';

  return (
    <>
      <div className="zenPageMobile-header">
        <div className="zenPageMobile-headerStart">
          {embedded
            ? (
                <i className="widgetHeaderControlPlaceholder" />
              )
            : (
                <Link
                  to={getCanonicalLanguagePath(language)}
                  className="widgetHeaderButton citiesHeaderButton_home"
                  aria-label={t('common.home')}
                >
                  <i className="citiesHeaderButton-icon citiesHeaderButton-icon_home" />
                </Link>
              )}
        </div>

        <div className="zenPageMobile-headerMiddle">
          <button
            className={cx('widgetHeaderButton', isEditMode && 'isActive')}
            type="button"
            aria-label="edit"
            aria-pressed={isEditMode}
            onClick={onEditModeToggle}
          >
            <i className="citiesHeaderButton-icon citiesHeaderButton-icon_edit" />
          </button>
          <button
            className="widgetHeaderButton"
            type="button"
            aria-label={t('common.addCity')}
            onClick={onAddCityClick}
          >
            <i className="citiesHeaderButton-icon citiesHeaderButton-icon_add" />
          </button>
          <button
            className="widgetHeaderButton"
            type="button"
            aria-label={t('common.reset')}
            onClick={onResetClick}
          >
            <i className="citiesHeaderButton-icon citiesHeaderButton-icon_reset" />
          </button>
        </div>
        <div className="zenPageMobile-headerEnd">
          {embedded
            ? (
                <Link
                  to={getCanonicalLanguagePath(language, PAGES.grid.path)}
                  className="widgetHeaderButton"
                  aria-label={t('common.openGrid')}
                >
                  <i className="citiesHeaderButton-icon citiesHeaderButton-icon_open" />
                </Link>
              )
            : (
                <button
                  className="widgetHeaderButton citiesHeaderButton_menu"
                  type="button"
                  aria-label={t('common.menu')}
                  onClick={() => setMenuOpen(true)}
                >
                  <i className="citiesHeaderButton-icon citiesHeaderButton-icon_menu" />
                </button>
              )}
        </div>
      </div>
      {!embedded && (
        <StandaloneMenuModal
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </>
  );
}
