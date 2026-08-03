import { useState } from 'react';
import { SITE_NAME } from '../../config';
import { useI18n } from '../../i18n';

import './style.css';

interface IAccordionItemData {
  isOpen: boolean;
}

export default function FAQ() {
  const {t} = useI18n();

  const DATA = [
    {
      id: 1,
      title: t('faq.free.title', {siteName: SITE_NAME}),
      content: (
        <>
          <p className="accordion-para">{t('faq.free.paragraph1', {siteName: SITE_NAME})}</p>
          <p className="accordion-para">{t('faq.free.paragraph2')}</p>
        </>
      ),
      tooltipData: {
        title: <span className="accordionTooltip-title">{t('faq.short')}</span>,
        content: <span className="accordionTooltip-para">{t('faq.yes')}</span>,
      }
    },
    {
      id: 2,
      title: t('faq.offline.title'),
      content: (
        <>
          <p className="accordion-para">{t('faq.offline.paragraph1', {siteName: SITE_NAME})}</p>
          <p className="accordion-para">{t('faq.offline.paragraph2')}</p>
        </>
      ),
      tooltipData: {
        title: <span className="accordionTooltip-title">{t('faq.short')}</span>,
        content: <span className="accordionTooltip-para">{t('faq.yes')}</span>,
      }
    },
    {
      id: 3,
      title: t('faq.account.title'),
      content: (
        <>
          <p className="accordion-para">{t('faq.account.paragraph1', {siteName: SITE_NAME})}</p>
          <p className="accordion-para">{t('faq.account.paragraph2')}</p>
        </>
      ),
      tooltipData: {
        title: <span className="accordionTooltip-title">{t('faq.short')}</span>,
        content: <span className="accordionTooltip-para">{t('faq.no')}</span>,
      }
    },

    {
      id: 4,
      title: t('faq.platforms.title'),
      content: (
        <>
          <p className="accordion-para">{t('faq.platforms.paragraph1', {siteName: SITE_NAME})}</p>
          <p className="accordion-para">{t('faq.platforms.paragraph2')}</p>
        </>
      ),
      tooltipData: {
        title: <span className="accordionTooltip-title">{t('faq.short')}</span>,
        content: <span className="accordionTooltip-para">{t('faq.platformsShort')}</span>,
      }
    },

    {
      id: 5,
      title: t('faq.notifications.title'),
      content: (
        <>
          <p className="accordion-para">{t('faq.notifications.paragraph1')}</p>
          <p className="accordion-para">{t('faq.notifications.paragraph2', {siteName: SITE_NAME})}</p>
        </>
      ),
      tooltipData: {
        title: <span className="accordionTooltip-title">{t('faq.short')}</span>,
        content: <span className="accordionTooltip-para">{t('faq.notificationsShort')}</span>,
      }
    },
  ];

  const [ accordionData, setAccordionData, ] = useState<[IAccordionItemData] | []>([]);

  const setActiveAccordionItem = (idx:number) => {
    if (!accordionData[idx]) {
      accordionData[idx] = { isOpen: false }
    }

    accordionData[idx].isOpen = !accordionData[idx].isOpen;

    setAccordionData([...accordionData]);
  }

  return (
    <div className="accordion accordion_faq">
      {DATA.map((accordionItem, idx) => {
        return (
          <div
            key={accordionItem.id}
            className={`accordion-item ${accordionData[idx] && accordionData[idx].isOpen ? 'isOpen' : ''}`}
          >
            <div className="accordion-header" onClick={() => setActiveAccordionItem(idx)}>
              <h3 className="accordion-title">{accordionItem.title}</h3>

              <span className="accordionTooltip">
                {accordionItem.tooltipData.title}
                {accordionItem.tooltipData.content}
              </span>
            </div>

            <div className="accordion-contentWrapper">
              <div className="accordion-content">
                {accordionItem.content}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  );
}
