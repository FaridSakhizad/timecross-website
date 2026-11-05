import { useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';

import { useClickOutside } from '../../hooks/useClickOutside';
import { useI18n } from '../../i18n';
import { getLanguageMenuItems, getLocalizedPathname } from '../../i18n/languageRouting';
import { cx } from '../../utils/classNames';

type LanguageMenuProps = {
  buttonClassName: string;
  buttonLabel: ReactNode;
  menuClassName?: string;
  /** Called after a language is chosen, before the page switches to it. */
  onSelect?: () => void;
};

/** The language switcher: a button and the list of the other languages, closed by a click outside. */
export default function LanguageMenu({
  buttonClassName,
  buttonLabel,
  menuClassName,
  onSelect,
}: LanguageMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const { language, t } = useI18n();
  const location = useLocation();

  useClickOutside(boxRef, isOpen, () => setIsOpen(false));

  return (
    <div
      className="langSelectButtonBox"
      ref={boxRef}
    >
      <button
        type="button"
        className={buttonClassName}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((isVisible) => !isVisible)}
      >
        <span className="langSelectButton-shortName">{buttonLabel}</span>
      </button>

      {isOpen && (
        <div className={cx('langSelectMenu', menuClassName)}>
          {getLanguageMenuItems(language).map((menuItem) => (
            <Link
              to={getLocalizedPathname(location.pathname, menuItem.language)}
              className="langSelectMenu-button"
              key={menuItem.language}
              onClick={() => {
                setIsOpen(false);
                onSelect?.();
              }}
            >
              {t(menuItem.labelKey)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
