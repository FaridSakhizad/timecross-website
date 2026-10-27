type ShareBrowser = {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
  clipboard?: { writeText: (text: string) => Promise<void> };
};

export async function shareEventLink(url: string, browser: ShareBrowser): Promise<'shared' | 'copied' | 'cancelled'> {
  const data = { url };
  let canShare = typeof browser.share === 'function';
  try {
    if (browser.canShare) canShare = canShare && browser.canShare(data);
  } catch {
    canShare = false;
  }
  if (canShare && browser.share) {
    try {
      // No awaited work precedes share(): preserve the button click's transient activation.
      await browser.share(data);
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
    }
  }
  if (!browser.clipboard) throw new Error('Clipboard unavailable');
  await browser.clipboard.writeText(url);
  return 'copied';
}
