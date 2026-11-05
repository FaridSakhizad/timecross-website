import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

import { useClickOutside } from '../../hooks/useClickOutside';
import { useI18n } from '../../i18n';
import { cx } from '../../utils/classNames';

import type { CityView } from './cityView';
import { getCityBaseName, getCityDisplayName } from './useLocalizedCities';

type SortableCityItemProps = {
  favoriteCity: CityView;
  onDelete: (cityId: string) => void;
  onRename: (cityId: string, customName: string) => void;
  onRequestRename: (city: CityView) => void;
  isMobileRenameMode: boolean;
};

export default function SortableCityItem({
  favoriteCity,
  onDelete,
  onRename,
  onRequestRename,
  isMobileRenameMode,
}: SortableCityItemProps) {
  const { t } = useI18n();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const renameBoxRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: favoriteCity.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const displayName = getCityDisplayName(favoriteCity);
  const baseName = getCityBaseName(favoriteCity);

  useEffect(() => {
    if (!isRenaming) {
      return;
    }

    renameInputRef.current?.focus();
    renameInputRef.current?.select();
  }, [isRenaming]);

  useClickOutside(renameBoxRef, isRenaming, () => {
    setIsRenaming(false);
    setRenameValue('');
  });

  const startRenaming = () => {
    if (isMobileRenameMode) {
      onRequestRename(favoriteCity);
      return;
    }

    setRenameValue(favoriteCity.customName || '');
    setIsRenaming(true);
  };

  const finishRenaming = () => {
    const nextCustomName = renameValue.trim();

    onRename(favoriteCity.id, nextCustomName === baseName ? '' : nextCustomName);
    setIsRenaming(false);
  };

  const cancelRenaming = () => {
    setIsRenaming(false);
    setRenameValue('');
  };

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      finishRenaming();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      cancelRenaming();
    }
  };

  const clearCustomName = () => {
    setRenameValue('');
    onRename(favoriteCity.id, '');
    setIsRenaming(false);
  };

  return (
    <div
      className={cx('citiesList-item', isDragging && 'isDragging')}
      ref={setNodeRef}
      style={style}
    >
      <button
        className="citiesList-dragButton"
        type="button"
        aria-label={t('cities.moveCity', { city: displayName })}
        {...attributes}
        {...listeners}
      />
      <button
        className="citiesList-dragButtonMobile"
        type="button"
        aria-label={t('cities.moveCity', { city: displayName })}
        {...attributes}
        {...listeners}
      />
      <i className={`citiesList-periodIcon citiesList-periodIcon_${favoriteCity.currentPeriod}`} />
      <div className="citiesList-city">
        {isRenaming
          ? (
              <div
                className="citiesList-nameInputBox"
                ref={renameBoxRef}
              >
                <input
                  className="citiesList-nameInput"
                  ref={renameInputRef}
                  value={renameValue}
                  aria-label={t('cities.renameCity', { city: displayName })}
                  placeholder={t('cities.customNamePlaceholder')}
                  onChange={(event) => setRenameValue(event.target.value)}
                  onKeyDown={handleRenameKeyDown}
                />
                {renameValue.length > 0 && (
                  <button
                    type="button"
                    className="citiesList-nameClear"
                    aria-label={t('cities.clearCustomName', { city: displayName })}
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={clearCustomName}
                  />
                )}
                <button
                  type="button"
                  className="citiesList-nameSave"
                  aria-label={t('cities.saveCustomName', { city: displayName })}
                  onClick={finishRenaming}
                />
              </div>
            )
          : (
              <button
                className="citiesList-nameButton"
                type="button"
                onClick={startRenaming}
                aria-label={t('cities.renameCity', { city: displayName })}
              >
                <span className="citiesList-name">
                  {displayName}
                  {favoriteCity.customName && (
                    <span className="citiesList-originalName">{` (${baseName})`}</span>
                  )}
                </span>
              </button>
            )}
        <span className="citiesList-timeOffset">
          {favoriteCity.relativeTimeOffset}
          {favoriteCity.dayShift && (
            <span className="citiesList-dayBadge">
              {favoriteCity.dayShift === 'tomorrow' ? t('cities.tomorrow') : t('cities.yesterday')}
            </span>
          )}
        </span>
      </div>
      <span className="citiesList-time">{favoriteCity.currentTime}</span>

      <button
        className="citiesList-deleteButton"
        type="button"
        aria-label={t('cities.deleteCity', { city: displayName })}
        onClick={() => onDelete(favoriteCity.id)}
      />
    </div>
  );
}
