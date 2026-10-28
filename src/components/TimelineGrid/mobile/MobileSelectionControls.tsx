import { Scan, X } from 'lucide-react';
import { useI18n } from '../../../i18n';
import GridCalendarActions from '../shared/GridCalendarActions';
import type { GridToolbarProps } from '../shared/types';

export type MobileSelectionControlsProps = Pick<GridToolbarProps, 'calendarEvent' | 'cities' | 'selectedHours' | 'isEditMode'> & {
  selectionEnabled: boolean;
  selectionDisabled: boolean;
  onSelectionToggle: () => void;
};

export default function MobileSelectionControls(props: MobileSelectionControlsProps) {
  const { t } = useI18n();
  return <>
    <button
      className={`widgetHeaderButton ${props.selectionEnabled ? 'isActive' : ''}`}
      type="button"
      title={t(props.selectionEnabled ? 'common.clearSelection' : 'common.selectHours')}
      aria-label={t(props.selectionEnabled ? 'common.clearSelection' : 'common.selectHours')}
      aria-pressed={props.selectionEnabled}
      disabled={props.selectionDisabled}
      onClick={props.onSelectionToggle}
    >
      {props.selectionEnabled ? <X size={18} aria-hidden="true" /> : <Scan size={18} aria-hidden="true" />}
    </button>
    <GridCalendarActions
      event={props.isEditMode || !props.selectionEnabled ? null : props.calendarEvent}
      cities={props.cities} hours={props.selectedHours}
    />
  </>;
}
