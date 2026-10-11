import './ConverterPage.css';

import ClientOnly from '../components/ClientOnly';
import Seo from '../components/Seo';
import TimeZoneConverter from '../components/TimeZoneConverter';
import type { ColorMode, TimeFormat } from '../settings';

type ConverterPageProps = {
  colorMode: ColorMode;
  timeFormat: TimeFormat;
  onColorModeButtonClick: () => void;
  onTimeFormatButtonClick: () => void;
};

export default function ConverterPage({
  colorMode,
  timeFormat,
  onColorModeButtonClick,
  onTimeFormatButtonClick,
}: ConverterPageProps) {
  return (
    <main className="converterPage">
      <Seo page="timeZoneConverter" />

      <ClientOnly>
        <TimeZoneConverter
          colorMode={colorMode}
          hasStandaloneControls
          timeFormat={timeFormat}
          onColorModeButtonClick={onColorModeButtonClick}
          onTimeFormatButtonClick={onTimeFormatButtonClick}
        />
      </ClientOnly>
    </main>
  );
}
