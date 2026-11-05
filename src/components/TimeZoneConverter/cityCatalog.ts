/**
 * Built-in cities covering the world's time zones. getDefaultSourceCity looks here for a city in
 * the visitor's time zone when neither their list nor the default cities have one.
 */
import type { PresetCity, StoredCity } from '../../settings';

const CATALOG: PresetCity[] = [
  {
    id: 'baker-island',
    customName: '',
    city: 'Baker Island',
    timezone: 'Etc/GMT+12',
  },
  {
    id: 'pago-pago',
    customName: '',
    city: 'Pago Pago',
    timezone: 'Pacific/Pago_Pago',
  },
  {
    id: 'honolulu',
    customName: '',
    city: 'Honolulu',
    timezone: 'Pacific/Honolulu',
  },
  {
    id: 'taiohae',
    customName: '',
    city: 'Taiohae',
    timezone: 'Pacific/Marquesas',
    visible: false,
  },
  {
    id: 'gambier-islands',
    customName: '',
    city: 'Gambier Islands',
    timezone: 'Pacific/Gambier',
  },
  {
    id: 'los-angeles',
    customName: '',
    city: 'Los Angeles',
    timezone: 'America/Los_Angeles',
  },
  {
    id: 'denver',
    customName: '',
    city: 'Denver',
    timezone: 'America/Denver',
  },
  {
    id: 'mexico-city',
    customName: '',
    city: 'Mexico City',
    timezone: 'America/Mexico_City',
  },
  {
    id: 'new-york',
    customName: '',
    city: 'New York',
    timezone: 'America/New_York',
  },
  {
    id: 'santiago',
    customName: '',
    city: 'Santiago',
    timezone: 'America/Santiago',
  },
  {
    id: 'st-johns',
    customName: '',
    city: "St. John's",
    timezone: 'America/St_Johns',
  },
  {
    id: 'rio-de-janeiro',
    customName: '',
    city: 'Rio de Janeiro',
    timezone: 'America/Sao_Paulo',
  },
  {
    id: 'fernando-de-noronha',
    customName: '',
    city: 'Fernando de Noronha',
    timezone: 'America/Noronha',
  },
  {
    id: 'ponta-delgada',
    customName: '',
    city: 'Ponta Delgada',
    timezone: 'Atlantic/Azores',
  },
  {
    id: 'london',
    customName: '',
    city: 'London',
    timezone: 'Europe/London',
  },
  {
    id: 'paris',
    customName: '',
    city: 'Paris',
    timezone: 'Europe/Paris',
  },
  {
    id: 'cape-town',
    customName: '',
    city: 'Cape Town',
    timezone: 'Africa/Johannesburg',
  },
  {
    id: 'nairobi',
    customName: '',
    city: 'Nairobi',
    timezone: 'Africa/Nairobi',
  },
  {
    id: 'tehran',
    customName: '',
    city: 'Tehran',
    timezone: 'Asia/Tehran',
  },
  {
    id: 'dubai',
    customName: '',
    city: 'Dubai',
    timezone: 'Asia/Dubai',
  },
  {
    id: 'kabul',
    customName: '',
    city: 'Kabul',
    timezone: 'Asia/Kabul',
  },
  {
    id: 'maldives',
    customName: '',
    city: 'Maldives',
    timezone: 'Indian/Maldives',
  },
  {
    id: 'mumbai',
    customName: '',
    city: 'Mumbai',
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'kathmandu',
    customName: '',
    city: 'Kathmandu',
    timezone: 'Asia/Kathmandu',
  },
  {
    id: 'dhaka',
    customName: '',
    city: 'Dhaka',
    timezone: 'Asia/Dhaka',
  },
  {
    id: 'yangon',
    customName: '',
    city: 'Yangon',
    timezone: 'Asia/Yangon',
  },
  {
    id: 'bangkok',
    customName: '',
    city: 'Bangkok',
    timezone: 'Asia/Bangkok',
  },
  {
    id: 'singapore',
    customName: '',
    city: 'Singapore',
    timezone: 'Asia/Singapore',
  },
  {
    id: 'eucla',
    customName: '',
    city: 'Eucla',
    timezone: 'Australia/Eucla',
    visible: false,
  },
  {
    id: 'tokyo',
    customName: '',
    city: 'Tokyo',
    timezone: 'Asia/Tokyo',
  },
  {
    id: 'darwin',
    customName: '',
    city: 'Darwin',
    timezone: 'Australia/Darwin',
  },
  {
    id: 'sydney',
    customName: '',
    city: 'Sydney',
    timezone: 'Australia/Sydney',
  },
  {
    id: 'lord-howe-island',
    customName: '',
    city: 'Lord Howe Island',
    timezone: 'Australia/Lord_Howe',
    visible: false,
  },
  {
    id: 'noumea',
    customName: '',
    city: 'Noumea',
    timezone: 'Pacific/Noumea',
  },
  {
    id: 'auckland',
    customName: '',
    city: 'Auckland',
    timezone: 'Pacific/Auckland',
  },
  {
    id: 'chatham-islands',
    customName: '',
    city: 'Chatham Islands',
    timezone: 'Pacific/Chatham',
    visible: false,
  },
  {
    id: 'apia',
    customName: '',
    city: 'Apia',
    timezone: 'Pacific/Apia',
  },
  {
    id: 'kiritimati',
    customName: '',
    city: 'Kiritimati',
    timezone: 'Pacific/Kiritimati',
  },
];

const recommendedOrder: Record<string, number> = {
  'new-york': 101,
  london: 102,
  paris: 103,
  dubai: 104,
  singapore: 105,
  tokyo: 106,
  sydney: 107,
  'los-angeles': 108,
  honolulu: 109,
  'rio-de-janeiro': 110,
  'cape-town': 111,
  auckland: 112,

  'mexico-city': 201,
  santiago: 202,
  'st-johns': 203,
  'ponta-delgada': 204,
  nairobi: 205,
  tehran: 206,
  maldives: 207,
  mumbai: 208,
  kathmandu: 209,
  bangkok: 210,
  darwin: 211,
  apia: 212,
};

const getRecommendedOrder = (city: PresetCity, index: number) => recommendedOrder[city.id] ?? 300 + index;

/** Visible catalog cities in the recommended order. */
export const catalogCities: StoredCity[] = CATALOG
  .map((city, index) => ({ city, order: getRecommendedOrder(city, index) }))
  .filter(({ city }) => city.visible !== false)
  .sort((left, right) => left.order - right.order)
  .map(({ city }) => city);
