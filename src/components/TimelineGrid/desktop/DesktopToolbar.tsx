import '../../widget.css';
import { useState } from 'react';
import { Link } from 'react-router';
import { Hand } from 'lucide-react';
import { PAN_CONTROLS_VISIBLE } from '../../../usePanPreference';
import { useI18n } from '../../../i18n';
import { getCanonicalLanguagePath } from '../../../i18n/languageRouting';
import StandaloneMenuModal from '../../StandaloneMenuModal';
import type { GridToolbarProps } from '../shared/types';

type DesktopToolbarProps = Omit<GridToolbarProps, 'calendarEvent' | 'selectedHours'> & {
  panEnabled: boolean;
  panDisabled: boolean;
  onPanToggle: () => void;
};

export default function DesktopToolbar(props: DesktopToolbarProps) {
  const { language, t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const embedded = props.presentation === 'embedded';

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
          {embedded ? <>
            <i className="widgetHeaderControlPlaceholder" />
            <i className="widgetHeaderControlPlaceholder" />
          </> : (
            <Link to={getCanonicalLanguagePath(language, '/')}
              className="widgetHeaderButton citiesHeaderButton_home" aria-label={t('common.home')}>
              <i className="citiesHeaderButton-icon citiesHeaderButton-icon_home" />
            </Link>
          )}
        </div>

        <div className="widgetHeaderMiddle">
          <button className={`widgetHeaderButton citiesHeaderButton_edit ${props.isEditMode ? 'isActive' : ''}`}
            type="button" aria-label="edit" aria-pressed={props.isEditMode} onClick={props.onEditModeToggle}>
            <i className="citiesHeaderButton-icon citiesHeaderButton-icon_edit" />
          </button>
          <button className="widgetHeaderButton citiesHeaderButton_add" type="button"
            aria-label={t('common.addCity')} onClick={props.onAddCityClick}>
            <i className="citiesHeaderButton-icon citiesHeaderButton-icon_add" />
          </button>
          <button className="widgetHeaderButton" type="button"
            aria-label={t('common.reset')} onClick={props.onResetClick}>
            <i className="citiesHeaderButton-icon citiesHeaderButton-icon_reset" />
          </button>
          {PAN_CONTROLS_VISIBLE && (
            <button className={`widgetHeaderButton ${props.panEnabled ? 'isActive' : ''}`}
              type="button" title={t('common.panMode')} aria-label={t('common.panMode')}
              aria-pressed={props.panEnabled} disabled={props.panDisabled} onClick={props.onPanToggle}>
              <Hand size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="widgetHeaderEnd">
          {embedded ? (
            <>
              <i className="widgetHeaderControlPlaceholder" />
              <Link to={getCanonicalLanguagePath(language, '/grid')}
                className="widgetHeaderButton" aria-label={t('common.openGrid')}>
                <i className="citiesHeaderButton-icon citiesHeaderButton-icon_open" />
              </Link>
            </>
          ) : (
            <button className="widgetHeaderButton citiesHeaderButton_menu" type="button"
              aria-label={t('common.menu')} onClick={() => setMenuOpen(true)}>
              <i className="citiesHeaderButton-icon citiesHeaderButton-icon_menu" />
            </button>
          )}
        </div>
      </div>
      {!embedded && (
        <StandaloneMenuModal colorMode={props.colorMode} timeFormat={props.timeFormat} isOpen={menuOpen}
          onClose={() => setMenuOpen(false)} onColorModeButtonClick={props.onColorModeButtonClick}
          onTimeFormatButtonClick={props.onTimeFormatButtonClick} />
      )}
    </>
  );
}
