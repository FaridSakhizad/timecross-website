import '../shared/selection.css';
import { createPortal } from 'react-dom';
import type { RefObject } from 'react';
import { useI18n } from '../../../i18n';

export default function DesktopSelectionOverlay({ overlayRef, frameLayerRef }: {
  overlayRef: RefObject<HTMLDivElement | null>; frameLayerRef: RefObject<HTMLDivElement | null>;
}) {
  const { t } = useI18n();
  if (typeof document === 'undefined') return null;
  return createPortal(
    <>
      <div ref={overlayRef} className="timelineGridSelectionRectangle timelineGridSelectionRectangle_desktop" hidden aria-hidden="true" />
      <div ref={frameLayerRef} className="timelineGridSelectionLayer timelineGridSelectionLayer_desktop" hidden>
        <div className="timelineGridSelectionFrame" data-grid-selection-frame>
          {(['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const).map((direction) => (
            <button key={direction} type="button" data-grid-resize={direction}
              className={`timelineGridSelectionHandle timelineGridSelectionHandle_${direction}`}
              aria-label={`${t('common.resizeSelection')} (${direction})`} title={t('common.resizeSelection')} />
          ))}
        </div>
      </div>
    </>, document.body,
  );
}
