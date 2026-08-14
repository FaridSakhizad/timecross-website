import '../Modal/style.css';
import './RenameCityModal.css';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';

type RenameCityModalProps = {
  isOpen: boolean;
  cityName: string;
  customName: string;
  title: string;
  placeholder: string;
  clearLabel: string;
  closeLabel: string;
  saveLabel: string;
  onClose: () => void;
  onSave: (customName: string) => void;
};

export default function RenameCityModal({
  isOpen,
  cityName,
  customName,
  title,
  placeholder,
  clearLabel,
  closeLabel,
  saveLabel,
  onClose,
  onSave,
}: RenameCityModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [renameValue, setRenameValue] = useState(() => customName || '');

  const setInputRef = useCallback((input: HTMLInputElement | null) => {
    inputRef.current = input;

    if (!input || !isOpen) {
      return;
    }

    input.focus({ preventScroll: true });
    input.select();
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setRenameValue('');
    onClose();
  }, [onClose]);

  const handleSave = useCallback(() => {
    const nextCustomName = renameValue.trim();

    onSave(nextCustomName === cityName ? '' : nextCustomName);
  }, [cityName, onSave, renameValue]);

  const handleClear = () => {
    onSave('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSave();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      handleClose();
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleWindowKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);

    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [handleClose, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      className="appModal renameCityModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rename-city-modal-title"
    >
      <button
        className="appModal-backdrop"
        type="button"
        aria-label={closeLabel}
        onClick={handleClose}
      />

      <div className="appModal-panel renameCityModal-panel">
        <div className="appModal-header">
          <span className="appModal-headerPlaceholder" />

          <h3 className="appModal-title" id="rename-city-modal-title">
            {title}
          </h3>

          <button
            className="appModal-close"
            type="button"
            aria-label={closeLabel}
            onClick={handleClose}
          />
        </div>

        <div className="renameCityModal-content">
          <div className="renameCityModal-inputBox">
            <input
              className="renameCityModal-input"
              ref={setInputRef}
              value={renameValue}
              aria-label={title}
              placeholder={placeholder}
              autoCapitalize="words"
              autoCorrect="off"
              onChange={(event) => setRenameValue(event.target.value)}
              onKeyDown={handleKeyDown}
            />
            {renameValue.length > 0 && (
              <button
                type="button"
                className="citiesList-nameClear renameCityModal-clear"
                aria-label={clearLabel}
                onClick={handleClear}
              />
            )}
          </div>

          <button
            type="button"
            className="citiesList-nameSave renameCityModal-save"
            aria-label={saveLabel}
            onClick={handleSave}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
