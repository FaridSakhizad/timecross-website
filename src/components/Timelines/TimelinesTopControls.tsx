import { Link } from 'react-router';

import { useI18n } from '../../i18n';

type TimelinesTopControlsProps = {
  onAddCityClick: () => void;
  onResetClick: () => void;
};

export default function TimelinesTopControls({
  onAddCityClick,
  onResetClick,
}: TimelinesTopControlsProps) {
  const { t } = useI18n();

  return (
    <div className="gridTopControls">
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

      <Link
        to="/cities"
        target="_blank"
        className="gridTopControlsButton"
        aria-label={t('common.openGrid')}
      >
        <i className="citiesHeaderButton-icon citiesHeaderButton-icon_cities" />
      </Link>

      <Link
        to="/grid"
        target="_blank"
        className="gridTopControlsButton"
        aria-label={t('common.openCities')}
      >
        <i className="citiesHeaderButton-icon citiesHeaderButton-icon_grid" />
      </Link>
    </div>
  );
}
