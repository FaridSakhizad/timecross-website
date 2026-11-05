import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { cx } from '../../utils/classNames';

type TurnstileRenderOptions = {
  sitekey: string;
  action: string;
  language: string;
  theme: 'light' | 'dark';
  size: 'flexible';
  appearance: 'interaction-only';
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
  'before-interactive-callback': () => void;
  'after-interactive-callback': () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string | undefined;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let turnstileScriptPromise: Promise<TurnstileApi> | null = null;

/** Loads the Turnstile script once per page, however many widgets ask for it. */
function loadTurnstile() {
  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }

  turnstileScriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');

    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile did not initialize')));

    script.onerror = () => {
      turnstileScriptPromise = null;
      script.remove();
      reject(new Error('Turnstile script failed to load'));
    };

    document.head.append(script);
  });

  return turnstileScriptPromise;
}

export type TurnstileWidgetHandle = {
  /** Asks for a fresh token; each token can be verified only once. */
  reset: () => void;
};

type TurnstileWidgetProps = {
  ref?: Ref<TurnstileWidgetHandle>;
  siteKey: string;
  action: string;
  language: string;
  theme: 'light' | 'dark';
  onTokenChange: (token: string | null) => void;
  onError: () => void;
};

/**
 * Cloudflare Turnstile. Usually invisible (`interaction-only`): it shows a checkbox only
 * when Cloudflare is not sure the visitor is a person.
 */
export default function TurnstileWidget({
  ref,
  siteKey,
  action,
  language,
  theme,
  onTokenChange,
  onError,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const callbacksRef = useRef({ onTokenChange, onError });
  // The container stays collapsed unless Cloudflare asks the visitor to click the checkbox.
  const [isInteractive, setIsInteractive] = useState(false);

  useEffect(() => {
    callbacksRef.current = { onTokenChange, onError };
  });

  useImperativeHandle(ref, () => ({
    reset() {
      callbacksRef.current.onTokenChange(null);

      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
    },
  }), []);

  useEffect(() => {
    if (!siteKey) {
      console.error('Turnstile site key is not set (VITE_TURNSTILE_SITE_KEY); the contact form cannot be sent.');
      callbacksRef.current.onError();
      return undefined;
    }

    let isCancelled = false;

    loadTurnstile()
      .then((turnstile) => {
        if (isCancelled || !containerRef.current) {
          return;
        }

        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          language,
          theme,
          size: 'flexible',
          appearance: 'interaction-only',
          callback: (token) => callbacksRef.current.onTokenChange(token),
          'expired-callback': () => callbacksRef.current.onTokenChange(null),
          'error-callback': () => {
            callbacksRef.current.onTokenChange(null);
            callbacksRef.current.onError();
          },
          'before-interactive-callback': () => setIsInteractive(true),
          'after-interactive-callback': () => setIsInteractive(false),
        }) ?? null;
      })
      .catch((error) => {
        console.error(error);

        if (!isCancelled) {
          callbacksRef.current.onError();
        }
      });

    return () => {
      isCancelled = true;

      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }

      widgetIdRef.current = null;
    };
  }, [action, language, siteKey, theme]);

  return (
    <div
      className={cx('contactForm-turnstile', isInteractive && 'contactForm-turnstile_visible')}
      ref={containerRef}
    />
  );
}
