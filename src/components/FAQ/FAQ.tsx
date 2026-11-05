import { useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { SITE_NAME } from '../../config';
import { useI18n } from '../../i18n';

import './style.css';
import { cx } from '../../utils/classNames';

interface IAccordionItemData {
  isOpen: boolean;
}

type FAQItem = {
  id: string | number;
  title: ReactNode;
  content: ReactNode;
  tooltipData?: {
    title: ReactNode;
    content: ReactNode;
  };
};

type FAQProps = {
  items?: FAQItem[];
};

export default function FAQ({ items }: FAQProps) {
  const { t } = useI18n();

  const DATA: FAQItem[] = items ?? [
    {
      id: 1,
      title: t('faq.free.title', { siteName: SITE_NAME }),
      content: (
        <>
          <p className="accordion-para">{t('faq.free.paragraph1', { siteName: SITE_NAME })}</p>
          <p className="accordion-para">{t('faq.free.paragraph2')}</p>
        </>
      ),
      tooltipData: {
        title: <span className="accordionTooltip-title">{t('faq.short')}</span>,
        content: <span className="accordionTooltip-para">{t('faq.yes')}</span>,
      },
    },
    {
      id: 2,
      title: t('faq.offline.title'),
      content: (
        <>
          <p className="accordion-para">{t('faq.offline.paragraph1', { siteName: SITE_NAME })}</p>
          <p className="accordion-para">{t('faq.offline.paragraph2')}</p>
        </>
      ),
      tooltipData: {
        title: <span className="accordionTooltip-title">{t('faq.short')}</span>,
        content: <span className="accordionTooltip-para">{t('faq.yes')}</span>,
      },
    },
    {
      id: 3,
      title: t('faq.account.title'),
      content: (
        <>
          <p className="accordion-para">{t('faq.account.paragraph1', { siteName: SITE_NAME })}</p>
          <p className="accordion-para">{t('faq.account.paragraph2')}</p>
        </>
      ),
      tooltipData: {
        title: <span className="accordionTooltip-title">{t('faq.short')}</span>,
        content: <span className="accordionTooltip-para">{t('faq.no')}</span>,
      },
    },

    {
      id: 4,
      title: t('faq.platforms.title'),
      content: (
        <>
          <p className="accordion-para">{t('faq.platforms.paragraph1', { siteName: SITE_NAME })}</p>
          <p className="accordion-para">{t('faq.platforms.paragraph2')}</p>
        </>
      ),
      tooltipData: {
        title: <span className="accordionTooltip-title">{t('faq.short')}</span>,
        content: <span className="accordionTooltip-para">{t('faq.platformsShort')}</span>,
      },
    },

    {
      id: 5,
      title: t('faq.notifications.title'),
      content: (
        <>
          <p className="accordion-para">{t('faq.notifications.paragraph1')}</p>
          <p className="accordion-para">{t('faq.notifications.paragraph2', { siteName: SITE_NAME })}</p>
        </>
      ),
      tooltipData: {
        title: <span className="accordionTooltip-title">{t('faq.short')}</span>,
        content: <span className="accordionTooltip-para">{t('faq.notificationsShort')}</span>,
      },
    },
  ];

  const [accordionData, setAccordionData] = useState<Record<number, IAccordionItemData>>({});

  const toggleAccordionItem = (idx: number) => {
    setAccordionData((currentData) => ({
      ...currentData,
      [idx]: { isOpen: !currentData[idx]?.isOpen },
    }));
  };

  const handleHeaderKeyDown = (event: KeyboardEvent<HTMLDivElement>, idx: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleAccordionItem(idx);
    }
  };

  return (
    <div className="accordion accordion_faq">
      {DATA.map((accordionItem, idx) => (
        <div
          key={accordionItem.id}
          className={cx('accordion-item', accordionData[idx]?.isOpen && 'isOpen')}
        >
          <div
            className="accordion-header"
            role="button"
            tabIndex={0}
            aria-expanded={Boolean(accordionData[idx]?.isOpen)}
            onClick={() => toggleAccordionItem(idx)}
            onKeyDown={(event) => handleHeaderKeyDown(event, idx)}
          >
            <h3 className="accordion-title">{accordionItem.title}</h3>

            {accordionItem.tooltipData && (
              <span className="accordionTooltip">
                {accordionItem.tooltipData.title}
                {accordionItem.tooltipData.content}
              </span>
            )}
          </div>

          <div className="accordion-contentWrapper">
            <div className="accordion-content">
              {accordionItem.content}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
