import '../shared/selection.css';
import type { RefObject } from 'react';
import { createPortal } from 'react-dom';

import { useI18n } from '../../../i18n';
import { cx } from '../../../utils/classNames';
import { GRID_FRAME_COVERS_USER_HOURS, GRID_FRAME_HANDLES } from '../shared/gridSelection';

type DesktopSelectionOverlayProps = {
  overlayRef: RefObject<HTMLDivElement | null>;
  frameRef: RefObject<HTMLDivElement | null>;
};

export default function DesktopSelectionOverlay({
  overlayRef,
  frameRef,
}: DesktopSelectionOverlayProps) {
  const { t } = useI18n();

  return (
    <>
      {typeof document !== 'undefined' && createPortal(
        <div
          ref={overlayRef}
          className="timelineGridSelectionRectangle timelineGridSelectionRectangle_desktop"
          hidden
          aria-hidden="true"
        />,
        document.body,
      )}
      <div
        ref={frameRef}
        className={cx('timelineGridSelectionFrame', 'timelineGridSelectionFrame_desktop', GRID_FRAME_COVERS_USER_HOURS && 'timelineGridSelectionFrame_overUserHours')}
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
    </>
  );
}
