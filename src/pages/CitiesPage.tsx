import './CitiesPage.css';

import ClientOnly from '../components/ClientOnly';
import { Cities } from '../components/lazyWidgets';
import Seo from '../components/Seo';

export default function CitiesPage() {
  return (
    <>
      <Seo />

      <ClientOnly>
        <Cities
          customClassNames="citiesPage"
          showStandaloneButton={false}
        />
      </ClientOnly>
    </>
  );
}
