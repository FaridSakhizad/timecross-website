import ClientOnly from '../components/ClientOnly';
import { TimelineGrid } from '../components/lazyWidgets';
import Seo from '../components/Seo';

export default function GridPage() {
  return (
    <>
      <Seo />

      <ClientOnly>
        <TimelineGrid />
      </ClientOnly>
    </>
  );
}
