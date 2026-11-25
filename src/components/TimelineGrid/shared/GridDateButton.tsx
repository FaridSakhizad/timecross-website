import { CalendarDays } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';

import { useI18n } from '../../../i18n';
import { getIntlLocale } from '../../../i18n/intlLocale';
import { formatInTimezone } from '../../../utils/abstractTimezone';
import { preload } from '../../../utils/preload';
import { getZonedDateParts } from '../../../utils/time';

const loadDatePickerModal = () => import('../../DatePickerModal');
const DatePickerModal = lazy(loadDatePickerModal);

type GridDateButtonProps = {
  /** The hour in the middle of the grid. */
  date: Date;
  timezone: string;
  disabled?: boolean;
  /** Without the weekday, "Nov 13", for narrow toolbars. */
  compact?: boolean;
  onSelect?: (value: string) => void;
};

const pad2 = (value: number) => String(value).padStart(2, '0');

/** The day in the middle of the grid, "Today" or "Fri, Nov 13"; a click picks another one. */
export default function GridDateButton({ date, timezone, disabled = false, compact = false, onSelect }: GridDateButtonProps) {
  const { language, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const { year, month, day } = getZonedDateParts(timezone, date);
  const today = getZonedDateParts(timezone, new Date());
  const isToday = today.year === year && today.month === month && today.day === day;
  const label = isToday
    ? t('common.today')
    : formatInTimezone(date, timezone, getIntlLocale(language), {
        ...(compact ? {} : { weekday: 'short' }),
        day: 'numeric',
        month: 'short',
      });

  return (
    <>
      <button
        className="widgetHeaderButton widgetHeaderButton_label"
        type="button"
        aria-label={`${t('timeZoneConverter.dateLabel')}: ${label}`}
        disabled={disabled || !onSelect}
        onPointerEnter={() => preload(loadDatePickerModal)}
        onFocus={() => preload(loadDatePickerModal)}
        onClick={() => setIsOpen(true)}
      >
        <CalendarDays
          size={16}
          aria-hidden="true"
        />
        {label}
      </button>
      {isOpen && onSelect && (
        <Suspense fallback={null}>
          <DatePickerModal
            dateLabel={t('timeZoneConverter.dateLabel')}
            isOpen
            language={language}
            value={`${year}-${pad2(month)}-${pad2(day)}`}
            onClose={() => setIsOpen(false)}
            onSelectDate={onSelect}
          />
        </Suspense>
      )}
    </>
  );
}
