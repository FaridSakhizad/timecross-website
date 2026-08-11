import './CitiesPage.css';

import Cities from '../components/Cities';
import type { TimeFormat } from '../settings';

type CitiesPageProps = {
  timeFormat: TimeFormat;
};

export default function CitiesPage({ timeFormat }: CitiesPageProps) {
  return (
    <Cities
      customClassNames="citiesPage"
      timeFormat={timeFormat}
    />
  );
}
