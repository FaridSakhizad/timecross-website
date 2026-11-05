import './ConverterPage.css';

import ClientOnly from '../components/ClientOnly';
import { TimeZoneConverter } from '../components/lazyWidgets';
import Seo from '../components/Seo';

export default function ConverterPage() {
  return (
    <main className="converterPage">
      <Seo />

      <ClientOnly>
        <TimeZoneConverter
          hasStandaloneControls
          syncUrl
        />
      </ClientOnly>
    </main>
  );
}
