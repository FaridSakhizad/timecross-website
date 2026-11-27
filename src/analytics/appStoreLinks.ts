import { APP_STORE_PROVIDER_TOKEN, APP_STORE_URL, GOOGLE_PLAY_URL } from '../config.ts';

import type { AppStore, AppStorePlacement } from './events.ts';

/**
 * A store link that tells the store where it was clicked, so that installs from the website show
 * up by button: App Store Connect reads "pt" and "ct" (with the provider token only), Google Play
 * Console the "referrer" with its UTM parameters.
 */
export function getAppStoreUrl(store: AppStore, placement: AppStorePlacement) {
  if (store === 'googlePlay') {
    const referrer = new URLSearchParams({
      utm_source: 'timecross.app',
      utm_medium: 'website',
      utm_campaign: placement,
    });

    return `${GOOGLE_PLAY_URL}&referrer=${encodeURIComponent(referrer.toString())}`;
  }

  if (!APP_STORE_PROVIDER_TOKEN) {
    return APP_STORE_URL;
  }

  const campaign = new URLSearchParams({
    pt: APP_STORE_PROVIDER_TOKEN,
    ct: placement,
    mt: '8',
  });

  return `${APP_STORE_URL}?${campaign.toString()}`;
}
