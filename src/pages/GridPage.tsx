import ClientOnly from '../components/ClientOnly';
import { TimelineGrid } from '../components/lazyWidgets';
import Seo from '../components/Seo';
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
