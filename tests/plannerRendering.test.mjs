import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';

import { registerSourceLoader } from './support/sourceLoader.mjs';

// Load the real TSX components without a browser; assets are irrelevant to markup assertions.
const hooks = registerSourceLoader();

after(() => hooks.deregister());

const { I18nProvider } = await import('../src/i18n/I18nProvider.tsx');
const { default: Desktop } = await import('../src/components/TimelineGrid/desktop/DesktopGrid.tsx');
const { default: Mobile } = await import('../src/components/TimelineGrid/mobile/MobileGrid.tsx');
const { default: TimelineGridSession } = await import('../src/components/TimelineGrid/shared/TimelineGridSession.tsx');
const { default: TimelineGrid } = await import('../src/components/TimelineGrid/TimelineGrid.tsx');
const { useMobileWidgetLayout } = await import('../src/hooks/useMobileWidgetLayout.ts');
const { buildGridEventUrl } = await import('../src/components/TimelineGrid/shared/eventUrlState.ts');
const { FEATURES } = await import('../src/config.ts');

const NEW_MEETING = '>Select hours for a meeting</button>';
// A phone's footer shares its width with the date button.
const MOBILE_NEW_MEETING = '>Meeting hours</button>';

const props = {
  colorMode: 'day',
  timeFormat: '24h',
  onColorModeButtonClick() {},
  onTimeFormatButtonClick() {},
};

function render(Component, presentation, url = '/en/grid', extraProps = {}) {
  const componentProps = { ...props, presentation, ...extraProps };
  const content = Component === Desktop || Component === Mobile
    ? React.createElement(TimelineGridSession, { ...componentProps, View: Component })
    : React.createElement(Component, componentProps);

  return renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [url] }, React.createElement(I18nProvider, { initialLanguage: 'en' }, content)));
}

test('application boundary can force either view without a browser or device detection', () => {
  assert.ok(render(TimelineGrid, 'zen', '/en/grid', { layout: 'mobile' }).includes('timelineGrid-userHours_mobile'));
  assert.ok(render(TimelineGrid, 'zen', '/en/grid', { layout: 'desktop' }).includes('timelineGrid-userHours_desktop'));
});

test('widget layout is correct on the first render and on each subsequent page mount', () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

  function LayoutProbe() {
    return React.createElement('span', null, useMobileWidgetLayout() ? 'mobile' : 'desktop');
  }

  try {
    for (const mobile of [true, true, false, false]) {
      globalThis.window = {
        matchMedia(query) {
          assert.equal(query, '(hover: none) and (pointer: coarse)');
          return { matches: mobile };
        },
      };
      assert.equal(renderToStaticMarkup(React.createElement(LayoutProbe)), `<span>${mobile ? 'mobile' : 'desktop'}</span>`);
    }

    delete globalThis.window;
    assert.equal(renderToStaticMarkup(React.createElement(LayoutProbe)), '<span>desktop</span>');
  } finally {
    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', originalWindow);
    } else {
      delete globalThis.window;
    }
  }
});

test('mobile selection controls live only in the footer in both presentations', () => {
  for (const presentation of ['zen', 'embedded']) {
    const html = render(Mobile, presentation);
    const footer = html.indexOf('class="zenPageMobile-footer"');

    assert.ok(footer > 0);
    assert.ok(html.indexOf(MOBILE_NEW_MEETING) > footer);
    assert.equal(html.split(MOBILE_NEW_MEETING).length - 1, 1);
    assert.ok(!html.includes('timelineGridCalendarButton'));
  }
});

for (const [name, Component] of [['desktop', Desktop], ['mobile', Mobile]]) {
  for (const presentation of ['zen', 'embedded']) {
    test(`${name}/${presentation} renders independently with shared cells and the existing header structure`, () => {
      const html = render(Component, presentation);
      const newMeeting = name === 'desktop' ? NEW_MEETING : MOBILE_NEW_MEETING;
      const header = name === 'desktop' ? 'widgetHeader' : 'zenPageMobile-header';

      for (const section of ['Start', 'Middle', 'End']) {
        assert.ok(html.includes(`${header}${section}`));
      }

      assert.equal(html.includes('widgetHeader-backdrop'), name === 'desktop');
      assert.equal(html.includes('widgetHeaderControlPlaceholder'), presentation === 'embedded');
      assert.equal(html.includes('aria-label="Pan"'), name === 'desktop');
      assert.ok(html.includes(newMeeting));
      // At the bottom, the date button shows the day in the middle of the grid: today until another is picked.
      const dateButton = html.indexOf('aria-label="Date: Today"');

      assert.ok(dateButton > html.indexOf(name === 'desktop' ? 'class="widgetFooter"' : 'class="zenPageMobile-footer"'));
      assert.ok(dateButton < html.indexOf(newMeeting));
      assert.doesNotMatch(html, /aria-label="Edit"[^>]*disabled=""/);

      if (name === 'desktop') {
        // The toolbar is rendered in every presentation, before the grid and never inside it.
        const toolbarIndex = html.indexOf('class="widgetHeader"');
        const gridIndex = html.indexOf('class="widgetContent timelineGrid');

        assert.ok(toolbarIndex >= 0 && gridIndex > toolbarIndex);
        assert.equal((html.match(/class="widgetHeader"/g) ?? []).length, 1);
        const footerIndex = html.indexOf('class="widgetFooter"');

        assert.ok(footerIndex > 0 && html.indexOf(newMeeting) > footerIndex);
        assert.ok(!html.includes('timelineGridCalendarButton'));
        assert.ok(!html.includes('timelineGridClearSelectionButton" hidden'));
      }

      assert.ok(html.includes(`timelineGrid-userHours_${name}`));
      assert.ok(html.includes('class="timelineGrid-row'));
      assert.equal(html.includes('timelineGrid-row_mobile'), name === 'mobile');
      assert.ok(!html.includes('timelineGrid-row_desktop'));
      assert.ok(!html.includes('timelineGrid-city_desktop'));
      assert.equal(html.includes('timelineGrid-city_mobile'), name === 'mobile');
      assert.ok(!html.includes('timelineGrid-city undefined'));
      assert.ok(html.includes('data-grid-hour-start='));
      assert.equal((html.match(/class="timelineGrid-hour(?: |")/g) ?? []).length, 92);
      assert.ok(!html.includes(`timelineGrid-row_${name === 'desktop' ? 'mobile' : 'desktop'}`));

      if (presentation === 'zen') {
        assert.ok(html.includes('aria-label="Home"'));
        assert.ok(html.includes('aria-label="Menu"'));
      } else {
        assert.ok(html.includes('aria-label="Open planner"'));
        assert.ok(!html.includes('aria-label="Menu"'));
      }
    });
  }

  test(`${name} shows a shared event as it came, with identical selected hours and calendar dates`, async () => {
    const start = Date.UTC(2026, 9, 26, 12);
    const city = {
      id: 'ny',
      city: 'New York',
      timezone: 'America/New_York',
      customName: '',
    };
    const { slotsOf } = await import('./support/gridSlots.mjs');
    const hours = slotsOf([0, 1, 2].map((offset) => ({ rowId: city.id, start: start + offset * 3600000 })));
    const url = buildGridEventUrl('https://timecross.app/en/grid', [city], hours);

    assert.ok(url);
    const html = render(Component, 'zen', url.replace('https://timecross.app', ''));

    // Three hours in the city's row, and the same three in the user's hours above it.
    assert.equal((html.match(/timelineGrid-cell[^"]* isSelected/g) ?? []).length, 3);
    assert.equal((html.match(/timelineGrid-hour[^"]* isSelected/g) ?? []).length, 3);
    // The date stays in the footer with hours selected; a shared meeting keeps its own day.
    assert.match(html, /aria-label="Date:[^"]*"[^>]*disabled=""/);
    // Cities cannot be edited under a selection.
    assert.match(html, /aria-label="Edit"[^>]*disabled=""[^>]*title="Clear the selection to edit the cities"/);
    assert.ok(html.includes(`timelineGridSelectionFrame_${name}`));
    // Shown as it came: a frame without handles until the meeting is taken into editing.
    assert.equal((html.match(/data-grid-resize=/g) ?? []).length, 0);
    assert.ok(!html.includes('timelineGridSelectionLayer'));
    const contentStart = html.indexOf('class="timelineGrid-content"');
    const frameStart = html.indexOf(`class="timelineGridSelectionFrame timelineGridSelectionFrame_${name}`);

    // A frame for the time only covers the user's hours too: it is drawn above their row.
    assert.equal(html.includes('timelineGridSelectionFrame_overUserHours'), FEATURES.timeOnlyFrame);
    const hoursStart = html.indexOf(`class="timelineGrid-userHours timelineGrid-userHours_${name}"`);

    assert.ok(contentStart >= 0 && hoursStart > contentStart && frameStart > hoursStart);

    if (name === 'mobile') {
      const footer = html.indexOf('class="zenPageMobile-footer"');

      // A meeting from a link opens its card also on a phone; the footer takes it into editing (in
      // place of clearing the selection) and opens the meeting's details in a dialog.
      const cardStart = html.indexOf('class="selectionCard"');

      assert.ok(cardStart > frameStart && cardStart < footer);
      assert.ok(html.lastIndexOf('aria-label="Edit meeting"') > footer);
      assert.ok(!html.includes('aria-label="Clear selection"'));
      // Already made, the meeting is saved rather than created.
      assert.match(html.slice(footer), /aria-haspopup="dialog".*Save meeting…<\/button>/);
      assert.ok(!html.includes(MOBILE_NEW_MEETING));
      assert.ok(!html.includes('timelineGridCalendarButton'));
    }

    if (name === 'desktop') {
      // The selection's card, beside the frame (in the still box after the grid's content), holds the actions.
      const cardStart = html.indexOf('class="selectionCard"');

      assert.ok(cardStart > html.indexOf('class="timelineGrid-content"'));
      assert.ok(html.includes('20261026T120000Z%2F20261026T150000Z'));
      assert.ok(html.includes('aria-label="Download event (.ics)"'));
      assert.ok(html.indexOf('aria-label="Add to Outlook"') > cardStart);
      // Its title and cities as they came: no field, no checkboxes; editing in place of clearing.
      assert.ok(html.includes('<p class="selectionCard-title">Meeting</p>'));
      assert.ok(html.includes('<div class="eventSummary-city">New York</div><div class="eventSummary-time">08:00 – 11:00'));
      assert.ok(html.indexOf('aria-label="Edit meeting"') > cardStart);
      assert.match(html, />Edit meeting<\/button>/);
      assert.ok(!html.includes('aria-label="Clear selection"'));
      assert.ok(!html.includes('timelineGridCalendarButton'));
    }
  });
}

test('translations other than English load on demand and fall back to English until then', async () => {
  const { isDictionaryLoaded, loadDictionary, translate } = await import('../src/i18n/dictionaries.ts');

  assert.equal(isDictionaryLoaded('en'), true);
  assert.equal(isDictionaryLoaded('de'), false);
  assert.equal(translate('de', 'contactForm.send'), 'Send');
  const [first, second] = await Promise.all([loadDictionary('de'), loadDictionary('de')]);

  assert.equal(first, second);
  assert.equal(translate('de', 'contactForm.send'), 'Senden');
  assert.equal(translate('de', 'no.such.key'), 'no.such.key');
});
