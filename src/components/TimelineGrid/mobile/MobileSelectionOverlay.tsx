import '../shared/selection.css';
import type { RefObject } from 'react';
import { useI18n } from '../../../i18n';

export default function MobileSelectionOverlay({ enabled, frameRef }: {
  enabled: boolean; frameRef: RefObject<HTMLDivElement | null>;
}) {
  const { t } = useI18n();
  if (!enabled) return null;
  return (
    <div ref={frameRef} className="timelineGridSelectionFrame timelineGridSelectionFrame_mobile" data-grid-selection-frame hidden>
      {(['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const).map((direction) => (
        <button key={direction} type="button" data-grid-resize={direction}
          className={`timelineGridSelectionHandle timelineGridSelectionHandle_${direction}`}
          aria-label={`${t('common.resizeSelection')} (${direction})`} title={t('common.resizeSelection')} />
      ))}
    </div>
  );
}
