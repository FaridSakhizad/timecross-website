import './CitiesPage.css';

import Cities from '../components/Cities';
import Seo from '../components/Seo';
import type { ColorMode, TimeFormat } from '../settings';

type CitiesPageProps = {
  colorMode: ColorMode;
  timeFormat: TimeFormat;
  onColorModeButtonClick: () => void;
  onTimeFormatButtonClick: () => void;
};

export default function CitiesPage({
  colorMode,
  timeFormat,
  onColorModeButtonClick,
  onTimeFormatButtonClick,
}: CitiesPageProps) {
  return (
    <>
      <Seo page="cities" />

      <Cities
        colorMode={colorMode}
        customClassNames="citiesPage"
        showStandaloneButton={false}
        timeFormat={timeFormat}
        onColorModeButtonClick={onColorModeButtonClick}
        onTimeFormatButtonClick={onTimeFormatButtonClick}
      />
    </>
  );
}
