import '../Modal/style.css';
import './AddCityModal.css';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../i18n';
import {
  getAbstractTimezoneRows,
  loadCitySearchData,
  searchCities,
  type CitySearchRow,
} from './citySearch';

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
      return new Intl.DisplayNames([language], { type: 'region' });
    } catch {
      return null;
    }
  }, [language]);
  const abstractTimezoneRows = useMemo(() => getAbstractTimezoneRows(), []);
  const [query, setQuery] = useState('');
  const [cities, setCities] = useState<CitySearchRow[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isDataUnavailable, setIsDataUnavailable] = useState(false);
  const hasActiveQuery = query.trim().length > 0;
  const shouldSearch = query.trim().length > 1;

  const resetModal = useCallback(() => {
    setQuery('');
    setCities([]);
    setIsSearchLoading(false);
    setIsDataUnavailable(false);
  }, []);

  const handleClose = useCallback(() => {
    resetModal();
    onClose();
  }, [onClose, resetModal]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [isOpen]);

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
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClose, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    window.setTimeout(() => inputRef.current?.focus(), 0);
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

    if (value.trim().length <= 1) {
      setCities([]);
      setIsSearchLoading(false);
    }
  };

  const renderCityButton = (city: CitySearchRow) => {
    const countryName = city.country
      ? getLocalizedCountryName(countryDisplayNames, city.country)
      : '';

    return (
      <button
        className="addCityModal-result"
        type="button"
        key={getCityResultKey(city)}
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

  return createPortal(
    <div
      className="appModal addCityModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-city-modal-title"
    >
      <button
        className="appModal-backdrop"
        type="button"
        aria-label={t('common.close')}
        onClick={handleClose}
      />

      <div className="appModal-panel addCityModal-panel">
        <div className="appModal-header">
          <span className="appModal-headerPlaceholder" />

          <h3 className="appModal-title" id="add-city-modal-title">
            {t('common.addCity')}
          </h3>

          <button
            className="appModal-close"
            type="button"
            aria-label={t('common.close')}
            onClick={handleClose}
          />
        </div>

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
          {isSearchLoading && (
            <p className="addCityModal-helperText">{t('common.loading')}</p>
          )}

          {isDataUnavailable && (
            <p className="addCityModal-helperText">{t('addCity.databaseUnavailable')}</p>
          )}

          {!isSearchLoading && !isDataUnavailable && shouldSearch && cities.length === 0 && (
            <p className="addCityModal-helperText">{t('common.noResults')}</p>
          )}

          {!isSearchLoading && !hasActiveQuery && (
            <div className="addCityModal-timezonePicker">
              <p className="addCityModal-timezonePickerTitle">{t('addCity.chooseTimezone')}</p>
              <div className="addCityModal-timezoneGrid">
                {abstractTimezoneRows.map(renderCityButton)}
              </div>
            </div>
          )}

          {!isSearchLoading && cities.length > 0 && cities.map(renderCityButton)}
        </div>
      </div>
    </div>,
    document.body,
  );
}
