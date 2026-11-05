import './style.css';
import type { ReactNode } from 'react';
import Footer from '../Footer';
import Header from '../Header';
import { useI18n } from '../../i18n';
import { getIntlLocale } from '../../i18n/intlLocale';

type LegalPageProps = {
  children: ReactNode;
  title: string;
  /** Calendar date in ISO format, e.g. '2026-11-04'. Shown in the page language. */
  updatedAt: string;
};

export default function LegalPage({
  children,
  title,
  updatedAt,
}: LegalPageProps) {
  const { language, t } = useI18n();
  // UTC on both sides so the server and the browser render the same day.
  const updatedDate = new Intl.DateTimeFormat(getIntlLocale(language), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${updatedAt}T00:00:00Z`));

  return (
    <>
      <Header />

      <main className="legalPage">
        <div className="container">
          <article className="legalPage-content">
            <h1 className="legalPage-title">{title}</h1>
            <p className="legalPage-updated">
              {t('common.lastUpdated', { date: updatedDate })}
            </p>
            {children}
          </article>
        </div>
      </main>

      <Footer />
    </>
  );
}
