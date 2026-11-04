import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';

import App from '../src/App';
import { I18nProvider } from '../src/i18n';
import type { AppLanguage } from '../src/settings';

export function render(url: string, language: AppLanguage) {
  return renderToString(
    <I18nProvider initialLanguage={language}>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </I18nProvider>,
  );
}
