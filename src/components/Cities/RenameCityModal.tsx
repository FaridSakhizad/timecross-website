import './RenameCityModal.css';

import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

import Modal from '../Modal';

type RenameCityModalProps = {
  isOpen: boolean;
  cityName: string;
  customName: string;
  title: string;
  placeholder: string;
  clearLabel: string;
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

  return (
    <Modal
      isOpen={isOpen}
      className="renameCityModal"
      title={title}
      initialFocusRef={inputRef}
      onClose={handleClose}
    >
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
    </Modal>
  );
}
