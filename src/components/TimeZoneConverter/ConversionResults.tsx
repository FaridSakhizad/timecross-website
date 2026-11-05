import { useI18n } from '../../i18n';
import type { DayPeriod } from '../../utils/time';
import { getCityDisplayName, type LocalizedCity } from '../Cities/useLocalizedCities';

/** The selected moment in one of the user's cities. */
export type ConversionResult = {
  city: LocalizedCity;
  dayLabel: string | null;
  offsetLabel: string;
  period: DayPeriod;
  timeLabel: string;
};

type ConversionResultsProps = {
  results: ConversionResult[];
  onAddCity: () => void;
  onDeleteCity: (cityId: string) => void;
};

export default function ConversionResults({
  results,
  onAddCity,
  onDeleteCity,
}: ConversionResultsProps) {
  const { t } = useI18n();

  return (
    <div className="citiesListBox scrollControl timeZoneConverter-listBox">
      <div className="citiesList timeZoneConverter-list">
        {results.map(({ city, dayLabel, offsetLabel, period, timeLabel }) => (
          <article
            className="citiesList-item timeZoneConverter-listItem"
            key={city.id}
          >
            <i className={`citiesList-periodIcon citiesList-periodIcon_${period} timeZoneConverter-resultIcon`} />
            <span className="timeZoneConverter-resultText timeZoneConverter-resultTime">{timeLabel}</span>
            <span className="timeZoneConverter-resultText timeZoneConverter-resultIn">{t('timeZoneConverter.inLabel')}</span>
            <span className="timeZoneConverter-resultText timeZoneConverter-resultCity">{getCityDisplayName(city)}</span>
            {dayLabel && (
              <span className="citiesList-dayBadge">{dayLabel}</span>
            )}

            <span className="timeZoneConverter-resultMeta">
              <span className="timeZoneConverter-offsetLabel">
                {offsetLabel}
              </span>
            </span>

            <button
              className="citiesList-deleteButton"
              type="button"
              aria-label={t('cities.deleteCity', { city: getCityDisplayName(city) })}
              onClick={() => onDeleteCity(city.id)}
            />
          </article>
        ))}

        <button
          className="citiesList-addButton"
          type="button"
          onClick={onAddCity}
        >
          <i className="citiesList-addButtonIcon" />
          <span className="citiesList-addButtonText">{t('common.addCity')}</span>
        </button>
      </div>
    </div>
  );
}
