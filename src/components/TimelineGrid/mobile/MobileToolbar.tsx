import './MobileToolbar.css';
import { useState } from 'react';
import { Link } from 'react-router';
import { Scan } from 'lucide-react';
import { useI18n } from '../../../i18n';
import { getCanonicalLanguagePath } from '../../../i18n/languageRouting';
import StandaloneMenuModal from '../../StandaloneMenuModal';
import GridCalendarActions from '../shared/GridCalendarActions';
import type { GridToolbarProps } from '../shared/types';

type MobileToolbarProps = GridToolbarProps & {
  selectionEnabled: boolean;
  selectionDisabled: boolean;
  onSelectionToggle: () => void;
};

export default function MobileToolbar(props: MobileToolbarProps) {
  const { language, t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const embedded = props.presentation === 'embedded';

  return (
    <>
      <div className={`widgetHeader widgetHeader_mobile${embedded ? '' : ' timelineGrid-toolbar timelineGrid-toolbar_mobile'}`}>
        <div className="widgetHeaderStart">
          {embedded ? null : (
            <Link to={getCanonicalLanguagePath(language, '/')}
              className="widgetHeaderButton citiesHeaderButton_home" aria-label={t('common.home')}>
              <i className="citiesHeaderButton-icon citiesHeaderButton-icon_home" />
            </Link>
          )}
        </div>

        <div className="widgetHeaderMiddle">
          <button
            className={`widgetHeaderButton citiesHeaderButton_edit ${props.isEditMode ? 'isActive' : ''}`}
            type="button"
            aria-label="edit"
            aria-pressed={props.isEditMode}
            onClick={props.onEditModeToggle}
          >
            <i className="citiesHeaderButton-icon citiesHeaderButton-icon_edit" />
          </button>
          <button
            className="widgetHeaderButton citiesHeaderButton_add"
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
          <button
            className={`widgetHeaderButton ${props.selectionEnabled ? 'isActive' : ''}`}
            type="button"
            title={t('common.selectHours')}
            aria-label={t('common.selectHours')}
            aria-pressed={props.selectionEnabled}
            disabled={props.selectionDisabled}
            onClick={props.onSelectionToggle}
          >
            <Scan size={18} aria-hidden="true" />
          </button>

          {props.calendarEvent && !props.isEditMode && (
            <GridCalendarActions
              event={props.calendarEvent}
              cities={props.cities}
              hours={props.selectedHours}
            />
          )}
        </div>
        <div className="widgetHeaderEnd">
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
