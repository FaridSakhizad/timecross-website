import './style.css';
import type { ReactNode } from 'react';
import { useI18n } from '../../i18n';

type LegalPageProps = {
  children: ReactNode;
  title: string;
  updatedAt: string;
};

export default function LegalPage({ children, title, updatedAt }: LegalPageProps) {
  const { t } = useI18n();

  return (
    <main className="legalPage">
      <div className="container">
        <article className="legalPage-content">
          <h1 className="legalPage-title">{title}</h1>
          <p className="legalPage-updated">{t('common.lastUpdated', { date: updatedAt })}</p>
          {children}
        </article>
      </div>
    </main>
  );
}
