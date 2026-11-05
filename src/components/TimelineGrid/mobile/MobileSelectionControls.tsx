import { Scan, X } from 'lucide-react';

import { useI18n } from '../../../i18n';
import { cx } from '../../../utils/classNames';
import GridCalendarActions from '../shared/GridCalendarActions';
import type { GridToolbarProps } from '../shared/types';

export type MobileSelectionControlsProps = Pick<GridToolbarProps, 'calendarEvent' | 'cities' | 'selectedHours' | 'isEditMode'> & {
  selectionEnabled: boolean;
  selectionDisabled: boolean;
  onSelectionToggle: () => void;
};

export default function MobileSelectionControls({
  calendarEvent,
  cities,
  isEditMode,
  onSelectionToggle,
  selectedHours,
  selectionDisabled,
  selectionEnabled,
}: MobileSelectionControlsProps) {
  const { t } = useI18n();

  return (
    <>
      <button
        className={cx('widgetHeaderButton', selectionEnabled && 'isActive')}
        type="button"
        title={t(selectionEnabled ? 'common.clearSelection' : 'common.selectHours')}
        aria-label={t(selectionEnabled ? 'common.clearSelection' : 'common.selectHours')}
        aria-pressed={selectionEnabled}
        disabled={selectionDisabled}
        onClick={onSelectionToggle}
      >
        {selectionEnabled
          ? (
              <X
                size={18}
                aria-hidden="true"
              />
            )
          : (
              <Scan
                size={18}
                aria-hidden="true"
              />
            )}
      </button>
      <GridCalendarActions
        event={isEditMode || !selectionEnabled ? null : calendarEvent}
        cities={cities}
        hours={selectedHours}
      />
    </>
  );
}
