/**
 * What the converter converts: the source city, the date and the time there. A reducer of pure
 * functions: the current time and the default source city come in with the actions, so every
 * transition is testable without a browser (tests/converterState.test.mjs).
 */
import type { StoredCity } from '../../settings';
import { getUtcDateForZonedTime } from '../../utils/time';

import { getDateInputValue, getTimeInputValue, parseDateInput } from './dateInput';
import type { ConverterUrlState } from './urlState';

export type ConverterState = {
  sourceCity: StoredCity | null;
  /** "2026-11-05" in the source city. */
  date: string;
  /** "14:30" in the source city. */
  time: string;
  /** The date was picked or came from a link; otherwise it is "today" in the source city. */
  hasCustomDate: boolean;
  /** Something was chosen, here or in a link, so the page URL describes the conversion. */
  hasSelection: boolean;
};

/** The page URL changed: on load, or with the browser's back and forward buttons. */
type UrlRestoredAction = {
  type: 'urlRestored';
  urlState: ConverterUrlState;
  defaultSourceCity: StoredCity | null;
  now: Date;
};

/** The city list changed; `defaultSourceCity` is the default for the new list. */
type CitiesChangedAction = {
  type: 'citiesChanged';
  defaultSourceCity: StoredCity | null;
  now: Date;
};

type SourceCitySelectedAction = {
  type: 'sourceCitySelected';
  city: StoredCity;
  now: Date;
};

type DateSelectedAction = {
  type: 'dateSelected';
  date: string;
};

/** An empty value (a cleared input) means the current time in the source city. */
type TimeChangedAction = {
  type: 'timeChanged';
  time: string;
  now: Date;
};

export type ConverterAction = UrlRestoredAction
  | CitiesChangedAction
  | SourceCitySelectedAction
  | DateSelectedAction
  | TimeChangedAction;

function getToday(city: StoredCity | null, now: Date) {
  return city ? getDateInputValue(city.timezone, now) : '';
}

function getCurrentTime(city: StoredCity | null, now: Date) {
  return city ? getTimeInputValue(city.timezone, now) : '';
}

/** The moment being converted, or null while the source city, date or time is missing or invalid. */
export function getConvertedDate({ sourceCity, date, time }: ConverterState) {
  const dateParts = parseDateInput(date, time);

  return sourceCity && dateParts ? getUtcDateForZonedTime(sourceCity.timezone, dateParts) : null;
}

/**
 * The state a URL describes. What the URL leaves out is filled in: the default source city, and
 * today's date and the current time there.
 */
export function createConverterState(
  urlState: ConverterUrlState,
  defaultSourceCity: StoredCity | null,
  now: Date,
): ConverterState {
  const sourceCity = urlState.sourceCity ?? defaultSourceCity;

  return {
    sourceCity,
    date: urlState.date ?? getToday(sourceCity, now),
    time: urlState.time ?? getCurrentTime(sourceCity, now),
    hasCustomDate: urlState.date !== null,
    hasSelection: urlState.sourceCity !== null || urlState.date !== null || urlState.time !== null,
  };
}

/** Whether the URL already describes the state, so it is not restored from the URL again. */
export function isStateInUrl(state: ConverterState, urlState: ConverterUrlState) {
  if (!state.hasSelection) {
    return !urlState.sourceCity && !urlState.date && !urlState.time;
  }

  return (
    urlState.sourceCity?.city === state.sourceCity?.city
    && urlState.sourceCity?.timezone === state.sourceCity?.timezone
    && urlState.date === state.date
    && urlState.time === state.time
  );
}

/**
 * A new source city. With a picked date the same moment is shown in the new city (14:30 in
 * Berlin becomes 22:30 in Tokyo). Without one the clock time stays and the date becomes today
 * in the new city: "09:00 in New York today".
 */
function selectSourceCity(state: ConverterState, city: StoredCity, now: Date): ConverterState {
  const nextState = {
    ...state,
    sourceCity: city,
    hasSelection: true,
  };

  if (!state.hasCustomDate) {
    return {
      ...nextState,
      date: getToday(city, now),
    };
  }

  const convertedDate = getConvertedDate(state);

  if (!convertedDate) {
    return nextState;
  }

  return {
    ...nextState,
    date: getDateInputValue(city.timezone, convertedDate),
    time: getTimeInputValue(city.timezone, convertedDate),
  };
}

export function converterReducer(state: ConverterState, action: ConverterAction): ConverterState {
  switch (action.type) {
    case 'urlRestored':
      return createConverterState(action.urlState, action.defaultSourceCity, action.now);

    case 'citiesChanged':
      // Only a converter without a source city (its city list was empty) takes the default one.
      if (state.sourceCity || !action.defaultSourceCity) {
        return state;
      }

      return {
        ...state,
        sourceCity: action.defaultSourceCity,
        date: state.date || getToday(action.defaultSourceCity, action.now),
        time: state.time || getCurrentTime(action.defaultSourceCity, action.now),
      };

    case 'sourceCitySelected':
      return selectSourceCity(state, action.city, action.now);

    case 'dateSelected':
      return {
        ...state,
        date: action.date,
        hasCustomDate: true,
        hasSelection: true,
      };

    case 'timeChanged':
      return {
        ...state,
        time: action.time || getCurrentTime(state.sourceCity, action.now),
        hasSelection: true,
      };
  }
}
