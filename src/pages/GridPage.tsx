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
    <TimelineGrid
      colorMode={colorMode}
      timeFormat={timeFormat}
      onColorModeButtonClick={onColorModeButtonClick}
      onTimeFormatButtonClick={onTimeFormatButtonClick}
    />
  );
}
