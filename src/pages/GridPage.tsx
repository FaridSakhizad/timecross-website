import ClientOnly from '../components/ClientOnly';
import Seo from '../components/Seo';
import TimelineGrid from '../components/TimelineGrid';
import type { ColorMode, TimeFormat } from '../settings';

type GridPageProps = {
  colorMode: ColorMode;
  timeFormat: TimeFormat;
  onColorModeButtonClick: () => void;
  onTimeFormatButtonClick: () => void;
};

export default function GridPage({
  colorMode,
  timeFormat,
  onColorModeButtonClick,
  onTimeFormatButtonClick,
}: GridPageProps) {
  return (
    <>
      <Seo page="grid" />

      <ClientOnly>
        <TimelineGrid
          colorMode={colorMode}
          timeFormat={timeFormat}
          onColorModeButtonClick={onColorModeButtonClick}
          onTimeFormatButtonClick={onTimeFormatButtonClick}
        />
      </ClientOnly>
    </>
  );
}
