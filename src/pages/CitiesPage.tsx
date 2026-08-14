import './CitiesPage.css';

import Cities from '../components/Cities';
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
    <Cities
      colorMode={colorMode}
      customClassNames="citiesPage"
      showStandaloneButton={false}
      timeFormat={timeFormat}
      onColorModeButtonClick={onColorModeButtonClick}
      onTimeFormatButtonClick={onTimeFormatButtonClick}
    />
  );
}
