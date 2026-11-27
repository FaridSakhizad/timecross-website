import type { AnchorHTMLAttributes } from 'react';

import { getAppStoreUrl, trackEvent, type AppStore, type AppStorePlacement } from '../../analytics';

type AppStoreLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'> & {
  store: AppStore;
  placement: AppStorePlacement;
};

/** A link to an app store that counts its clicks and tells the store which button it was. */
export default function AppStoreLink({
  store,
  placement,
  ...props
}: AppStoreLinkProps) {
  return (
    <a
      {...props}
      href={getAppStoreUrl(store, placement)}
      onClick={() => trackEvent('app_store_click', { store, placement })}
    />
  );
}
