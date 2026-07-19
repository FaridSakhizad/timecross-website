import { useState, type FormEvent } from 'react';

import { CONTACT_API_PATH } from '../../config';
import { useI18n } from '../../i18n';

import './style.css';

type ContactFormStatus = 'idle' | 'sending' | 'sent' | 'error';

type ContactResponse = {
  ok: boolean;
  error?: string;
};

export default function ContactForm() {
  const [contactFormStatus, setContactFormStatus] = useState<ContactFormStatus>('idle');
  const [contactFormMessage, setContactFormMessage] = useState('');
  const { t } = useI18n();

  const handleContactFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const form = event.currentTarget;
    const name = String(formData.get('name') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const message = String(formData.get('message') ?? '').trim();

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
        }),
      });
      const result = await response.json() as ContactResponse;

      if (!response.ok || !result.ok) {
        throw new Error(t('contactForm.error'));
      }

      form.reset();
      setContactFormStatus('sent');
      setContactFormMessage(t('contactForm.sent'));
    } catch (error) {
      setContactFormStatus('error');
      setContactFormMessage(error instanceof Error ? error.message : t('contactForm.error'));
    }
  };

  return (
    <form className="contactForm" onSubmit={handleContactFormSubmit}>
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
