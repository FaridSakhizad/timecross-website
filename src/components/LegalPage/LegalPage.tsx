import './style.css';
import type { ReactNode } from 'react';
import Footer from '../Footer';
import Header from '../Header';
import { useI18n } from '../../i18n';
import type { ColorMode, TimeFormat } from '../../settings';

type LegalPageProps = {
  children: ReactNode;
  colorMode: ColorMode;
  timeFormat: TimeFormat;
  title: string;
  updatedAt: string;
  onColorModeButtonClick: () => void;
  onTimeFormatButtonClick: () => void;
};

export default function LegalPage({
  children,
  colorMode,
  timeFormat,
  title,
  updatedAt,
  onColorModeButtonClick,
  onTimeFormatButtonClick,
}: LegalPageProps) {
  const { t } = useI18n();

  return (
    <>
      <Header
        colorMode={colorMode}
        timeFormat={timeFormat}
        onColorModeButtonClick={onColorModeButtonClick}
        onTimeFormatButtonClick={onTimeFormatButtonClick}
      />

      <main className="legalPage">
        <div className="container">
          <article className="legalPage-content">
            <h1 className="legalPage-title">{title}</h1>
            <p className="legalPage-updated">{t('common.lastUpdated', { date: updatedAt })}</p>
            {children}
          </article>
        </div>
      </main>

      <Footer />
    </>
  );
}
