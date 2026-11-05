import './style.css';

import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';

import { useI18n } from '../../i18n';
import { cx } from '../../utils/classNames';

type ModalProps = {
  isOpen: boolean;
  /** Block name of the modal: "addCityModal" adds addCityModal and addCityModal-panel. */
  className: string;
  /** Shown in the modal header; without a title the modal has only a close button. */
  title?: ReactNode;
  /** Accessible name when there is no visible title. */
  label?: string;
  /** Element to focus when the modal opens; the panel itself by default. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
  onClose: () => void;
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/** Keeps Tab and Shift+Tab inside the modal. */
function trapFocus(event: KeyboardEvent, container: HTMLElement) {
  const focusable = [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)];
  const first = focusable[0];
  const last = focusable.at(-1);

  if (!first || !last) {
    event.preventDefault();

    return;
  }

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * Modal dialog: rendered into <body>, locks page scrolling, closes on Escape and on a backdrop
 * click, keeps keyboard focus inside and returns it to where it was when the modal closes.
 */
export default function Modal({
  isOpen,
  className,
  title,
  label,
  initialFocusRef,
  children,
  onClose,
}: ModalProps) {
  const { t } = useI18n();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // After the opening click is handled, so the focus lands in the modal.
    const focusTimeoutId = window.setTimeout(() => {
      (initialFocusRef?.current ?? panelRef.current)?.focus({ preventScroll: true });
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        onCloseRef.current();
      }

      if (event.key === 'Tab' && panelRef.current) {
        trapFocus(event, panelRef.current);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimeoutId);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [initialFocusRef, isOpen]);

  if (!isOpen) {
    return null;
  }

  const closeButton = (
    <button
      className="appModal-close"
      type="button"
      aria-label={t('common.close')}
      onClick={onClose}
    />
  );

  return createPortal(
    <div
      className={cx('appModal', className)}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : label}
    >
      <button
        className="appModal-backdrop"
        type="button"
        tabIndex={-1}
        aria-label={t('common.close')}
        onClick={onClose}
      />

      <div
        className={`appModal-panel ${className}-panel`}
        ref={panelRef}
        tabIndex={-1}
      >
        {title
          ? (
              <div className="appModal-header">
                <span className="appModal-headerPlaceholder" />

                <h3
                  className="appModal-title"
                  id={titleId}
                >
                  {title}
                </h3>

                {closeButton}
              </div>
            )
          : closeButton}

        {children}
      </div>
    </div>,
    document.body,
  );
}
