import '../../compoundWidget.css';
import '../../widgetHeaderButtons.css';
import { Hand } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { useI18n } from '../../../i18n';
import { getCanonicalLanguagePath } from '../../../i18n/languageRouting';
import { PAGES } from '../../../routes';
import { cx } from '../../../utils/classNames';
import StandaloneMenuModal from '../../StandaloneMenuModal';
import type { GridToolbarProps } from '../shared/types';

type DesktopToolbarProps = Omit<GridToolbarProps, 'calendarEvent' | 'selectedHours'> & {
  panEnabled: boolean;
  panDisabled: boolean;
  onPanToggle: () => void;
};

export default function DesktopToolbar({
  isEditMode,
  onAddCityClick,
  onEditModeToggle,
  onPanToggle,
  onResetClick,
  panDisabled,
  panEnabled,
  presentation,
}: DesktopToolbarProps) {
  const { language, t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const embedded = presentation === 'embedded';

  return (
    <>
      <div className="widgetHeader">
        <div className="widgetHeader-backdrop">
          <i className="widgetHeader-backdropCorner bll" />
          <i className="widgetHeader-backdropCorner blr" />
          <i className="widgetHeader-backdropCorner brl" />
          <i className="widgetHeader-backdropCorner brr" />
        </div>

        <div className="widgetHeaderStart">
          {embedded
            ? (
                <>
                  <i className="widgetHeaderControlPlaceholder" />
                </>
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

        <div className="widgetHeaderMiddle">
          <button
            className={cx('widgetHeaderButton citiesHeaderButton_edit', isEditMode && 'isActive')}
            type="button"
            aria-label="edit"
            aria-pressed={isEditMode}
            onClick={onEditModeToggle}
          >
            <i className="citiesHeaderButton-icon citiesHeaderButton-icon_edit" />
          </button>
          <button
            className="widgetHeaderButton citiesHeaderButton_add"
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
          <button
            className={cx('widgetHeaderButton', panEnabled && 'isActive')}
            type="button"
            title={t('common.panMode')}
            aria-label={t('common.panMode')}
            aria-pressed={panEnabled}
            disabled={panDisabled}
            onClick={onPanToggle}
          >
            <Hand
              size={16}
              strokeWidth={2}
              aria-hidden="true"
            />
          </button>
        </div>

        <div className="widgetHeaderEnd">
          {embedded
            ? (
                <>
                  <Link
                    to={getCanonicalLanguagePath(language, PAGES.grid.path)}
                    className="widgetHeaderButton"
                    aria-label={t('common.openGrid')}
                  >
                    <i className="citiesHeaderButton-icon citiesHeaderButton-icon_open" />
                  </Link>
                </>
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
