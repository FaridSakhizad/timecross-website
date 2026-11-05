import '../shared/selection.css';
import type { RefObject } from 'react';
import { createPortal } from 'react-dom';

import { useI18n } from '../../../i18n';

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
        className="timelineGridSelectionFrame timelineGridSelectionFrame_desktop"
        data-grid-selection-frame
        hidden
      >
        {(['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const).map((direction) => (
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
