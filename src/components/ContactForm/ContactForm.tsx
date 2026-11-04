import { useRef, useState, type FormEvent } from 'react';

import { CONTACT_API_PATH, TURNSTILE_ACTION } from '../../config';
import { useI18n } from '../../i18n';
import { usePreferences } from '../../usePreferences';
import TurnstileWidget, { type TurnstileWidgetHandle } from './TurnstileWidget';

import './style.css';

/**
 * Public Turnstile site key, set with VITE_TURNSTILE_SITE_KEY at build time (.env.production).
 * In development it falls back to Cloudflare's test key that always passes.
 */
const TURNSTILE_SITE_KEY: string = import.meta.env.VITE_TURNSTILE_SITE_KEY
  || (import.meta.env.DEV ? '1x00000000000000000000AA' : '');

type ContactFormStatus = 'idle' | 'sending' | 'sent' | 'error';

type ContactResponse = {
  ok: boolean;
  error?: string;
  /** Machine-readable reason set by the Worker: rate-limited, verification-failed, unavailable. */
  code?: string;
};

export default function ContactForm() {
  const [contactFormStatus, setContactFormStatus] = useState<ContactFormStatus>('idle');
  const [contactFormMessage, setContactFormMessage] = useState('');
  // Set on the first interaction, so the server can drop submissions made in under a few seconds.
  const startedAtRef = useRef<number | null>(null);
  const { language, t } = useI18n();
  const { colorMode } = usePreferences();
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isTurnstileBroken, setIsTurnstileBroken] = useState(false);

  const getErrorMessage = (status: number, result: ContactResponse | null) => {
    if (status === 429 || result?.code === 'rate-limited') {
      return t('contactForm.tooManyRequests');
    }

    if (result?.code === 'verification-failed') {
      return t('contactForm.verificationFailed');
    }

    return t('contactForm.error');
  };

  const handleContactFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const form = event.currentTarget;
    const name = String(formData.get('name') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const message = String(formData.get('message') ?? '').trim();
    const website = String(formData.get('website') ?? '');

    if (!turnstileToken) {
      setContactFormStatus('error');
      setContactFormMessage(t(isTurnstileBroken ? 'contactForm.verificationUnavailable' : 'contactForm.verificationPending'));
      return;
    }

    setContactFormStatus('sending');
    setContactFormMessage('');

    try {
      const response = await fetch(CONTACT_API_PATH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          message,
          website,
          startedAt: startedAtRef.current ?? undefined,
          turnstileToken,
        }),
      });
      // A 429 from Cloudflare itself (WAF rule) is an HTML page, not JSON.
      const result = await response.json().catch(() => null) as ContactResponse | null;

      if (!response.ok || !result?.ok) {
        throw new Error(getErrorMessage(response.status, result));
      }

      form.reset();
      startedAtRef.current = null;
      setContactFormStatus('sent');
      setContactFormMessage(t('contactForm.sent'));
    } catch (error) {
      setContactFormStatus('error');
      setContactFormMessage(error instanceof Error ? error.message : t('contactForm.error'));
    } finally {
      // The token was spent on this request (or rejected), so get a fresh one for the next try.
      turnstileRef.current?.reset();
    }
  };

  return (
    <form
      className="contactForm"
      onSubmit={handleContactFormSubmit}
      onFocus={() => {
        startedAtRef.current ??= Date.now();
      }}
    >
      {/* Honeypot: invisible to people and screen readers, bots tend to fill it in. */}
      <div className="contactForm-honeypot" aria-hidden="true">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="contactForm-row">
        <input
          type="text"
          className="input contactForm-input"
          name="name"
          placeholder={t('contactForm.name')}
          maxLength={100}
          required
        />
      </div>
      <div className="contactForm-row">
        <input
          type="email"
          className="input contactForm-input"
          name="email"
          placeholder={t('contactForm.email')}
          maxLength={254}
          required
        />
      </div>
      <div className="contactForm-row">
        <textarea
          className="textarea contactForm-input"
          name="message"
          placeholder={t('contactForm.message')}
          maxLength={5000}
          required
        ></textarea>
      </div>
      <TurnstileWidget
        ref={turnstileRef}
        siteKey={TURNSTILE_SITE_KEY}
        action={TURNSTILE_ACTION}
        language={language}
        theme={colorMode === 'night' ? 'dark' : 'light'}
        onTokenChange={(token) => {
          setTurnstileToken(token);

          if (token) {
            setIsTurnstileBroken(false);
          }
        }}
        onError={() => setIsTurnstileBroken(true)}
      />
      <div className="contactForm-row">
        <button
          className="button contactForm-submitButton"
          type="submit"
          disabled={contactFormStatus === 'sending'}
        >
          {contactFormStatus === 'sending' ? t('contactForm.sending') : t('contactForm.send')}
        </button>
      </div>
      {contactFormMessage && (
        <p
          className={`contactForm-status contactForm-status_${contactFormStatus}`}
          role="status"
        >
          {contactFormMessage}
        </p>
      )}
    </form>
  );
}
