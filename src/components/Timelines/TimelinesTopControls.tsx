import { Link } from 'react-router';
import { Hand } from 'lucide-react';
import { useI18n } from '../../i18n';
import { getCanonicalLanguagePath } from '../../i18n/languageRouting';

type TimelinesTopControlsProps = {
  isEditMode: boolean;
  onAddCityClick: () => void;
  onEditModeToggle: () => void;
  onResetClick: () => void;
  isPanEnabled: boolean;
  isPanDisabled: boolean;
  onPanToggle: () => void;
};

export default function TimelinesTopControls({
  isEditMode,
  onAddCityClick,
  onEditModeToggle,
  onResetClick,
  isPanEnabled,
  isPanDisabled,
  onPanToggle,
}: TimelinesTopControlsProps) {
  const { language, t } = useI18n();

  return (
    <div className="gridTopControls">
      <button
        className={`gridTopControlsButton gridTopControlsButton_edit ${isEditMode ? 'isActive' : ''}`}
        type="button"
        aria-label="edit"
        aria-pressed={isEditMode}
        onClick={onEditModeToggle}
      >
        <i className="citiesHeaderButton-icon citiesHeaderButton-icon_edit" />
      </button>

      <button
        className="gridTopControlsButton gridTopControlsButton_add"
        type="button"
        aria-label={t('common.addCity')}
        onClick={onAddCityClick}
      >
        <i className="citiesHeaderButton-icon citiesHeaderButton-icon_add" />
      </button>

      <button
        className="gridTopControlsButton gridTopControlsButton_reset"
        type="button"
        onClick={onResetClick}
        aria-label={t('common.reset')}
      />

      <button
        className={`gridTopControlsButton timelinesTopPanButton ${isPanEnabled ? 'isActive' : ''}`}
        type="button"
        title={t('common.panMode')}
        aria-label={t('common.panMode')}
        aria-pressed={isPanEnabled}
        disabled={isPanDisabled}
        onClick={onPanToggle}
      >
        <Hand size={16} aria-hidden="true" />
      </button>

      <Link
        to={getCanonicalLanguagePath(language, '/grid')}
        className="gridTopControlsButton gridTopControlsButton_grid"
        aria-label={t('common.openGrid')}
      >
        <i className="citiesHeaderButton-icon citiesHeaderButton-icon_grid" />
      </Link>
    </div>
  );
}
