import './style.css';
import type { ReactNode } from 'react';

type LegalPageProps = {
  children: ReactNode;
  title: string;
  updatedAt: string;
};

export default function LegalPage({ children, title, updatedAt }: LegalPageProps) {
  return (
    <main className="legalPage">
      <div className="container">
        <article className="legalPage-content">
          <h1 className="legalPage-title">{title}</h1>
          <p className="legalPage-updated">Last updated: {updatedAt}</p>
          {children}
        </article>
      </div>
    </main>
  );
}
