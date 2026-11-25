import { CalendarPlus, Plus, X } from 'lucide-react';

import { useI18n } from '../../../i18n';
import GridDateButton from '../shared/GridDateButton';
import type { TimelineGridShellProps } from '../shared/types';

export type MobileSelectionControlsProps = Pick<TimelineGridShellProps, 'browserTimezone' | 'focusedDate' | 'onDateSelect'> & {
  selectionEnabled: boolean;
  selectionDisabled: boolean;
  onSelectionToggle: () => void;
  /** Opens the dialog with the meeting's details and actions. */
  onCreateEvent: () => void;
};

/**
 * A phone's footer: the date and "Meeting hours" without a selection; with one, the date (the
 * selected hours move to another day), "Create event…", which opens the meeting's details in a
 * dialog, and "Clear selection".
 */
export default function MobileSelectionControls({
  browserTimezone,
  focusedDate,
  onCreateEvent,
  onDateSelect,
  onSelectionToggle,
  selectionDisabled,
  selectionEnabled,
}: MobileSelectionControlsProps) {
  const { t } = useI18n();

  const dateButton = (
    <GridDateButton
      compact
      date={focusedDate}
      timezone={browserTimezone}
      disabled={selectionDisabled}
      onSelect={onDateSelect}
    />
  );

  // Another day also with hours selected: they move to it.
  if (selectionEnabled) {
    return (
      <>
        {dateButton}
        <button
          className="widgetHeaderButton widgetHeaderButton_label"
          type="button"
          aria-haspopup="dialog"
          onClick={onCreateEvent}
        >
          <CalendarPlus
            size={18}
            aria-hidden="true"
          />
          {t('common.createEventMore')}
        </button>

        <button
          className="widgetHeaderButton"
          type="button"
          onClick={onSelectionToggle}
          aria-label={t('common.clearSelection')}
        >
          <X
            size={18}
            aria-hidden="true"
          />
        </button>
      </>
    );
  }

  return (
    <>
      {dateButton}
      <button
        className="widgetHeaderButton widgetHeaderButton_label"
        type="button"
        disabled={selectionDisabled}
        onClick={onSelectionToggle}
      >
        <Plus
          size={18}
          aria-hidden="true"
        />
        {/* Shorter than on desktop: it shares a phone's footer with the date. */}
        {t('common.selectMeetingHoursShort')}
      </button>
    </>
  );
}
