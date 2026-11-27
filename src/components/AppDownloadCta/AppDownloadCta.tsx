import './style.css';

import { useI18n } from '../../i18n';
import { cx } from '../../utils/classNames';
import AppStoreLink from '../AppStoreLink';

type AppDownloadCtaProps = {
  className?: string;
};

export default function AppDownloadCta({
  className,
}: AppDownloadCtaProps) {
  const { t } = useI18n();

  return (
    <div className={cx('appDownloadCta', className)}>
      <AppStoreLink
        store="appStore"
        placement="toolCta"
        className="downloadLink downloadLink_appStore"
        aria-label={t('common.appStore')}
        target="_blank"
      />
      <AppStoreLink
        store="googlePlay"
        placement="toolCta"
        className="downloadLink downloadLink_googlePlay"
        aria-label={t('common.googlePlay')}
        target="_blank"
      />
    </div>
  );
}
