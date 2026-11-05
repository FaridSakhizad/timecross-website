import { Link } from 'react-router';

import { useI18n } from '../../i18n';
import { getCanonicalLanguagePath } from '../../i18n/languageRouting';
import { PAGES } from '../../routes';
import { cx } from '../../utils/classNames';

type ConverterHeaderProps = {
  hasStandaloneControls: boolean;
  isEditMode: boolean;
  /** Query string of the converter, carried over to the full-screen page. */
  search: string;
  syncUrl: boolean;
  onAddCity: () => void;
  onEditModeToggle: () => void;
  onMenuOpen: () => void;
};

export default function ConverterHeader({
  hasStandaloneControls,
  isEditMode,
  search,
  syncUrl,
  onAddCity,
  onEditModeToggle,
  onMenuOpen,
}: ConverterHeaderProps) {
  const { language, t } = useI18n();

  return (
    <div className="citiesHeader timeZoneConverter-header">
      {(hasStandaloneControls || syncUrl) && (
        <Link
          to={getCanonicalLanguagePath(language)}
          className="citiesHeaderButton citiesHeaderButton_home"
          aria-label={t('common.home')}
          title={t('common.home')}
        >
          <i className="citiesHeaderButton-icon citiesHeaderButton-icon_home" />
        </Link>
      )}

      <button
        className={cx('citiesHeaderButton citiesHeaderButton_edit', isEditMode && 'isActive')}
        type="button"
        aria-label={t('common.edit')}
        aria-pressed={isEditMode}
        onClick={onEditModeToggle}
      >
        <i className="citiesHeaderButton-icon citiesHeaderButton-icon_edit" />
      </button>
      <button
        className="citiesHeaderButton"
        type="button"
        aria-label={t('common.addCity')}
        onClick={onAddCity}
      >
        <i className="citiesHeaderButton-icon citiesHeaderButton-icon_add" />
      </button>

      {syncUrl && !hasStandaloneControls && (
        <Link
          to={{
            pathname: getCanonicalLanguagePath(language, PAGES.convert.path),
            search,
          }}
          className="citiesHeaderButton citiesHeaderButton_converter"
          aria-label="Fullscreen"
          title="Fullscreen"
        >
          <i className="citiesHeaderButton-icon citiesHeaderButton-icon_open" />
        </Link>
      )}

      {hasStandaloneControls && (
        <button
          className="citiesHeaderButton citiesHeaderButton_menu"
          type="button"
          aria-label={t('common.menu')}
          onClick={onMenuOpen}
        >
          <i className="citiesHeaderButton-icon citiesHeaderButton-icon_menu" />
        </button>
      )}
    </div>
  );
}
