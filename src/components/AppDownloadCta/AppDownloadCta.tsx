import './style.css';

import {
  APP_STORE_URL,
  GOOGLE_PLAY_URL,
} from '../../config';
import { useI18n } from '../../i18n';

type AppDownloadCtaProps = {
  className?: string;
};

export default function AppDownloadCta({
  className,
}: AppDownloadCtaProps) {
  const { t } = useI18n();

  return (
    <div className={['appDownloadCta', className].filter(Boolean).join(' ')}>
      <a
        href={APP_STORE_URL}
        className="downloadLink downloadLink_appStore"
        aria-label={t('common.appStore')}
        target="_blank"
      ></a>
      <a
        href={GOOGLE_PLAY_URL}
        className="downloadLink downloadLink_googlePlay"
        aria-label={t('common.googlePlay')}
        target="_blank"
      ></a>
    </div>
  );
}
