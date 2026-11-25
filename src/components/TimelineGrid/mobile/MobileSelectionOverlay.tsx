import '../shared/selection.css';
import type { RefObject } from 'react';

import { useI18n } from '../../../i18n';
import { cx } from '../../../utils/classNames';
import { GRID_FRAME_COVERS_USER_HOURS, GRID_FRAME_HANDLES } from '../shared/gridSelection';

type MobileSelectionOverlayProps = {
  enabled: boolean;
  frameRef: RefObject<HTMLDivElement | null>;
};

export default function MobileSelectionOverlay({
  enabled,
  frameRef,
}: MobileSelectionOverlayProps) {
  const { t } = useI18n();

  if (!enabled) {
    return null;
  }

  return (
    <div
      ref={frameRef}
      className={cx('timelineGridSelectionFrame', 'timelineGridSelectionFrame_mobile', GRID_FRAME_COVERS_USER_HOURS && 'timelineGridSelectionFrame_overUserHours')}
      data-grid-selection-frame
      hidden
    >
      {GRID_FRAME_HANDLES.map((direction) => (
        <button
          key={direction}
          type="button"
          data-grid-resize={direction}
          className={`timelineGridSelectionHandle timelineGridSelectionHandle_${direction}`}
          aria-label={`${t('common.resizeSelection')} (${direction})`}
          title={t('common.resizeSelection')}
        />
      ))}
    </div>
  );
}
