import '../Modal/style.css';
import 'react-day-picker/style.css';
import './DatePickerModal.css';

import { useEffect, useMemo } from 'react';
import { DayPicker } from 'react-day-picker';
import { de } from 'date-fns/locale/de';
import { enUS } from 'date-fns/locale/en-US';
import { es } from 'date-fns/locale/es';
import { fr } from 'date-fns/locale/fr';
import { pt } from 'date-fns/locale/pt';
import { ru } from 'date-fns/locale/ru';
import { uk } from 'date-fns/locale/uk';

import type { AppLanguage } from '../../settings';

type DatePickerModalProps = {
  closeLabel: string;
  dateLabel: string;
  isOpen: boolean;
  language: AppLanguage;
  onClose: () => void;
  onSelectDate: (dateValue: string) => void;
  value: string;
};

const DATE_PICKER_LOCALES = {
  de,
  en: enUS,
  es,
  fr,
  pt,
  ru,
  uk,
} satisfies Record<AppLanguage, typeof enUS>;

function parseDatePickerValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return undefined;
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day, 12);

  if (
    date.getFullYear() !== year
    || date.getMonth() !== month
    || date.getDate() !== day
  ) {
    return undefined;
  }

  return date;
}

function formatDatePickerValue(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export default function DatePickerModal({
  closeLabel,
  dateLabel,
  isOpen,
  language,
  onClose,
  onSelectDate,
  value,
}: DatePickerModalProps) {
  const selectedDate = useMemo(() => parseDatePickerValue(value), [value]);
  const calendarMonth = selectedDate ?? new Date();

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

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="appModal timeZoneDatePickerModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="time-zone-date-picker-modal-title"
    >
      <button
        className="appModal-backdrop"
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
      />

      <div className="appModal-panel timeZoneDatePickerModal-panel">
        <div className="appModal-header">
          <span className="appModal-headerPlaceholder" />

          <h3 className="appModal-title" id="time-zone-date-picker-modal-title">
            {dateLabel}
          </h3>

          <button
            className="appModal-close"
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
          />
        </div>

        <div className="timeZoneDatePickerModal-body">
          <DayPicker
            animate
            captionLayout="dropdown"
            className="timeZoneDatePicker"
            locale={DATE_PICKER_LOCALES[language]}
            mode="single"
            defaultMonth={calendarMonth}
            navLayout="after"
            selected={selectedDate}
            onSelect={(date) => {
              if (!date) {
                return;
              }

              onSelectDate(formatDatePickerValue(date));
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
