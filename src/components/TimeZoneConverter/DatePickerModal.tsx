import 'react-day-picker/style.css';
import './DatePickerModal.css';

import { useMemo } from 'react';
import { DayPicker } from 'react-day-picker';
import { de } from 'date-fns/locale/de';
import { enUS } from 'date-fns/locale/en-US';
import { es } from 'date-fns/locale/es';
import { fr } from 'date-fns/locale/fr';
import { pt } from 'date-fns/locale/pt';
import { ptBR } from 'date-fns/locale/pt-BR';
import { ru } from 'date-fns/locale/ru';
import { uk } from 'date-fns/locale/uk';

import type { AppLanguage } from '../../settings';
import Modal from '../Modal';

type DatePickerModalProps = {
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
  'pt-BR': ptBR,
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
  dateLabel,
  isOpen,
  language,
  onClose,
  onSelectDate,
  value,
}: DatePickerModalProps) {
  const selectedDate = useMemo(() => parseDatePickerValue(value), [value]);
  const calendarMonth = selectedDate ?? new Date();

  return (
    <Modal
      isOpen={isOpen}
      className="timeZoneDatePickerModal"
      title={dateLabel}
      onClose={onClose}
    >
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
    </Modal>
  );
}
