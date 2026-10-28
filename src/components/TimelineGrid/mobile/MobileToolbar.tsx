import { useState } from 'react';
import { Link } from 'react-router';
import { useI18n } from '../../../i18n';
import { getCanonicalLanguagePath } from '../../../i18n/languageRouting';
import StandaloneMenuModal from '../../StandaloneMenuModal';
import { type MobileSelectionControlsProps } from './MobileSelectionControls';
import type { GridToolbarProps } from '../shared/types';

type MobileToolbarProps = GridToolbarProps & MobileSelectionControlsProps;

export default function MobileToolbar(props: MobileToolbarProps) {
  const { language, t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const embedded = props.presentation === 'embedded';

  return (
    <>
      <div className="zenPageMobile-header">
        <div className="zenPageMobile-headerStart">
          {embedded ? (
              <i className="widgetHeaderControlPlaceholder" />
            ) : (
            <Link to={getCanonicalLanguagePath(language, '/')}
              className="widgetHeaderButton citiesHeaderButton_home" aria-label={t('common.home')}>
              <i className="citiesHeaderButton-icon citiesHeaderButton-icon_home" />
            </Link>
          )}
        </div>

        <div className="zenPageMobile-headerMiddle">
          <button
            className={`widgetHeaderButton ${props.isEditMode ? 'isActive' : ''}`}
            type="button"
            aria-label="edit"
            aria-pressed={props.isEditMode}
            onClick={props.onEditModeToggle}
          >
            <i className="citiesHeaderButton-icon citiesHeaderButton-icon_edit" />
          </button>
          <button
            className="widgetHeaderButton"
            type="button"
            aria-label={t('common.addCity')}
            onClick={props.onAddCityClick}
          >
            <i className="citiesHeaderButton-icon citiesHeaderButton-icon_add" />
          </button>
          <button
            className="widgetHeaderButton"
            type="button"
            aria-label={t('common.reset')}
            onClick={props.onResetClick}
          >
            <i className="citiesHeaderButton-icon citiesHeaderButton-icon_reset" />
          </button>
        </div>
        <div className="zenPageMobile-headerEnd">
          {embedded ? (
            <Link
              to={getCanonicalLanguagePath(language, '/grid')}
              className="widgetHeaderButton"
              aria-label={t('common.openGrid')}
            >
              <i className="citiesHeaderButton-icon citiesHeaderButton-icon_open" />
            </Link>
          ) : (
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
          colorMode={props.colorMode}
          timeFormat={props.timeFormat}
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
          onColorModeButtonClick={props.onColorModeButtonClick}
          onTimeFormatButtonClick={props.onTimeFormatButtonClick}
        />
      )}
    </>
  );
}
