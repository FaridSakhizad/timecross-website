import './AddCityModal.css';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useI18n } from '../../i18n';
import { getIntlLocale } from '../../i18n/intlLocale';
import { cx } from '../../utils/classNames';
import Modal from '../Modal';

import { loadCitySearchData, type CitySearchRow } from './cityData';
import { searchCities } from './citySearch';
import { getAbstractTimezoneRows, getNorthAmericanTimezoneRows } from './timezoneRows';

type AddCityModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (city: CitySearchRow) => void;
};

const SEARCH_DELAY_MS = 300;

function getCityResultKey(city: CitySearchRow) {
  return `${city.id}-${city.name}-${city.country}`;
}

function getLocalizedCountryName(
  displayNames: Intl.DisplayNames | null,
  countryCode: string,
) {
  return displayNames?.of(countryCode) || countryCode;
}

export default function AddCityModal({
  isOpen,
  onClose,
  onSave,
}: AddCityModalProps) {
  const { language, t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const countryDisplayNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([getIntlLocale(language)], { type: 'region' });
    } catch {
      return null;
    }
  }, [language]);
  const abstractTimezoneRows = useMemo(() => getAbstractTimezoneRows(), []);
  const northAmericanTimezoneRows = useMemo(() => getNorthAmericanTimezoneRows(), []);
  const [query, setQuery] = useState('');
  const [cities, setCities] = useState<CitySearchRow[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isDataUnavailable, setIsDataUnavailable] = useState(false);
  const [isTimezonePickerOpen, setIsTimezonePickerOpen] = useState(false);
  const [isAbbreviationPickerOpen, setIsAbbreviationPickerOpen] = useState(false);
  const hasActiveQuery = query.trim().length > 0;
  const shouldSearch = query.trim().length > 1;

  const resetModal = useCallback(() => {
    setQuery('');
    setCities([]);
    setIsSearchLoading(false);
    setIsDataUnavailable(false);
    setIsTimezonePickerOpen(false);
    setIsAbbreviationPickerOpen(false);
  }, []);

  const handleClose = useCallback(() => {
    resetModal();
    onClose();
  }, [onClose, resetModal]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    loadCitySearchData()
      .then(() => {
        setIsDataUnavailable(false);
      })
      .catch((error: unknown) => {
        console.error('Failed to load city search data:', error);
        setIsDataUnavailable(true);
      });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !shouldSearch) {
      return undefined;
    }

    let isCanceled = false;
    const timeoutId = window.setTimeout(() => {
      setIsSearchLoading(true);

      searchCities(query, language)
        .then((results) => {
          if (!isCanceled) {
            setCities(results);
          }
        })
        .catch((error: unknown) => {
          console.error('Failed to search cities:', error);

          if (!isCanceled) {
            setCities([]);
            setIsDataUnavailable(true);
          }
        })
        .finally(() => {
          if (!isCanceled) {
            setIsSearchLoading(false);
          }
        });
    }, SEARCH_DELAY_MS);

    return () => {
      isCanceled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, language, query, shouldSearch]);

  if (!isOpen) {
    return null;
  }

  const handleSave = (city: CitySearchRow) => {
    resetModal();
    onSave(city);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setIsTimezonePickerOpen(false);
    setIsAbbreviationPickerOpen(false);

    if (value.trim().length <= 1) {
      setCities([]);
      setIsSearchLoading(false);
    }
  };

  const handleTimezonePickerToggle = () => {
    setIsTimezonePickerOpen((isOpen) => {
      const nextIsOpen = !isOpen;

      if (nextIsOpen) {
        setIsAbbreviationPickerOpen(false);
      }

      return nextIsOpen;
    });
  };

  const handleAbbreviationPickerToggle = () => {
    setIsAbbreviationPickerOpen((isOpen) => {
      const nextIsOpen = !isOpen;

      if (nextIsOpen) {
        setIsTimezonePickerOpen(false);
      }

      return nextIsOpen;
    });
  };

  const renderCityButton = (city: CitySearchRow, tabIndex?: number) => {
    const countryName = city.country
      ? getLocalizedCountryName(countryDisplayNames, city.country)
      : '';

    return (
      <button
        className="addCityModal-result"
        type="button"
        key={getCityResultKey(city)}
        tabIndex={tabIndex}
        onClick={() => handleSave(city)}
      >
        <span className="addCityModal-resultName">
          {city.localizedName || city.name}
          {!!countryName && `, ${countryName}`}
        </span>

        {!city.isAbstractTimezone && !!city.localizedName && city.localizedName !== city.name && (
          <span className="addCityModal-resultOriginalName">{city.name}</span>
        )}

        {!city.isAbstractTimezone && (
          <span className="addCityModal-resultTimezone">{city.tz}</span>
        )}
      </button>
    );
  };

  const renderTimezoneAbbreviationButton = (city: CitySearchRow, tabIndex?: number) => (
    <button
      className="addCityModal-result addCityModal-result_abbreviation"
      type="button"
      key={getCityResultKey(city)}
      tabIndex={tabIndex}
      onClick={() => handleSave(city)}
    >
      <span className="addCityModal-resultAbbreviationName">
        {city.timezoneAbbreviationShortName ?? city.name}
      </span>

      <span className="addCityModal-resultAbbreviationFullName">
        {city.name}
        {city.timezoneAbbreviationName && `, ${city.timezoneAbbreviationName}`}
      </span>
    </button>
  );

  const renderTimezoneAbbreviations = (tabIndex?: number) => (
    <div className="addCityModal-timezoneAbbreviations">
      {northAmericanTimezoneRows.map((city) => renderTimezoneAbbreviationButton(city, tabIndex))}
    </div>
  );

  return (
    <Modal
      isOpen
      className="addCityModal"
      title={t('common.addCity')}
      initialFocusRef={inputRef}
      onClose={handleClose}
    >
      <div className="addCityModal-searchBox">
        <span className="addCityModal-searchIcon" />
        <input
          className="addCityModal-searchInput"
          type="search"
          ref={inputRef}
          value={query}
          placeholder={t('addCity.searchPlaceholder')}
          autoCapitalize="none"
          autoCorrect="off"
          onChange={(event) => handleQueryChange(event.target.value)}
        />
      </div>

      <div className="addCityModal-results">
        <div className="addCityModal-searchResults">
          {isSearchLoading && (
            <p className="addCityModal-helperText">{t('common.loading')}</p>
          )}

          {isDataUnavailable && (
            <p className="addCityModal-helperText">{t('addCity.databaseUnavailable')}</p>
          )}

          {!isSearchLoading && !isDataUnavailable && shouldSearch && cities.length === 0 && (
            <p className="addCityModal-helperText">{t('common.noResults')}</p>
          )}

          {!isSearchLoading && cities.length > 0 && cities.map((city) => renderCityButton(city))}
        </div>

        {!isSearchLoading && !hasActiveQuery && (
          <section className="addCityModal-fixedTimezones">
            <div className="addCityModal-timezonePicker">
              <div className="addCityModal-timezonePickerControls">
                <button
                  className="addCityModal-timezonePickerToggle"
                  type="button"
                  aria-expanded={isTimezonePickerOpen}
                  onClick={handleTimezonePickerToggle}
                >
                  <span>{t('addCity.chooseTimezone')}</span>
                  <i
                    className="addCityModal-timezonePickerToggleIcon"
                    aria-hidden="true"
                  />
                </button>

                <button
                  className="addCityModal-timezonePickerToggle"
                  type="button"
                  aria-expanded={isAbbreviationPickerOpen}
                  onClick={handleAbbreviationPickerToggle}
                >
                  <span>{t('addCity.chooseAbbreviation')}</span>
                  <i
                    className="addCityModal-timezonePickerToggleIcon"
                    aria-hidden="true"
                  />
                </button>
              </div>

              <div
                className={cx('addCityModal-timezonePickerPanel', isTimezonePickerOpen && 'isOpen')}
                aria-hidden={!isTimezonePickerOpen}
              >
                <div className="addCityModal-timezonePickerPanelInner">
                  <div className="addCityModal-timezoneGrid">
                    {abstractTimezoneRows.map((city) => renderCityButton(
                      city,
                      isTimezonePickerOpen ? undefined : -1,
                    ))}
                  </div>
                </div>
              </div>

              <div
                className={cx('addCityModal-timezonePickerPanel', isAbbreviationPickerOpen && 'isOpen')}
                aria-hidden={!isAbbreviationPickerOpen}
              >
                <div className="addCityModal-timezonePickerPanelInner">
                  {renderTimezoneAbbreviations(isAbbreviationPickerOpen ? undefined : -1)}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}
