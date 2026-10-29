import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import React from 'react';
import 'react/jsx-runtime';
import 'react-dom';
import '@dnd-kit/core';
import '@dnd-kit/sortable';
import '@dnd-kit/utilities';
import 'lucide-react';
import 'date-fns';
import 'ics';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import ts from 'typescript';

// Load the real TSX components without a browser; assets are irrelevant to markup assertions.
const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url));
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      const path = fileURLToPath(new URL(specifier, context.parentURL));
      const file = [path, `${path}.ts`, `${path}.tsx`, `${path}/index.ts`, `${path}/index.tsx`]
        .find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
      if (file) return nextResolve(pathToFileURL(file).href, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (!url.startsWith('file:')) return nextLoad(url, context);
    const path = fileURLToPath(url);
    if (!path.startsWith(sourceRoot)) return nextLoad(url, context);
    const extension = extname(path);
    if (extension === '.ts' || extension === '.tsx') {
      const result = ts.transpileModule(readFileSync(path, 'utf8'), {
        fileName: path,
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX, verbatimModuleSyntax: true },
      });
      return { format: 'module', source: result.outputText, shortCircuit: true };
    }
    if (extension === '.json') {
      return { format: 'module', source: `export default ${readFileSync(path, 'utf8')};`, shortCircuit: true };
    }
    if (['.css', '.svg', '.png', '.jpg'].includes(extension)) {
      return { format: 'module', source: `export default ${JSON.stringify(url)};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
after(() => hooks.deregister());

const { I18nProvider } = await import('../src/i18n/I18nProvider.tsx');
const { default: Desktop } = await import('../src/components/TimelineGrid/desktop/DesktopGrid.tsx');
const { default: Mobile } = await import('../src/components/TimelineGrid/mobile/MobileGrid.tsx');
const { default: TimelineGridSession } = await import('../src/components/TimelineGrid/shared/TimelineGridSession.tsx');
const { default: Planner } = await import('../src/components/Planner/Planner.tsx');
const { useMobileWidgetLayout } = await import('../src/useMobileWidgetLayout.ts');
const { default: GridCalendarActions } = await import('../src/components/TimelineGrid/shared/GridCalendarActions.tsx');
const { buildGridEventUrl } = await import('../src/components/TimelineGrid/shared/eventUrlState.ts');

const props = { colorMode: 'day', timeFormat: '24h',
  onColorModeButtonClick() {}, onTimeFormatButtonClick() {} };

function render(Component, presentation, url = '/en/grid', extraProps = {}) {
  const componentProps = { ...props, presentation, ...extraProps };
  const content = Component === Desktop || Component === Mobile
    ? React.createElement(TimelineGridSession, { ...componentProps, View: Component })
    : React.createElement(Component, componentProps);
  return renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [url] },
    React.createElement(I18nProvider, { initialLanguage: 'en' },
      content)));
}

test('application boundary can force either view without a browser or device detection', () => {
  assert.ok(render(Planner, 'zen', '/en/grid', { layout: 'mobile' }).includes('timelineGrid-userHours_mobile'));
  assert.ok(render(Planner, 'zen', '/en/grid', { layout: 'desktop' }).includes('timelineGrid-userHours_desktop'));
});

test('widget layout is correct on the first render and on each subsequent page mount', () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  function LayoutProbe() {
    return React.createElement('span', null, useMobileWidgetLayout() ? 'mobile' : 'desktop');
  }
  try {
    for (const mobile of [true, true, false, false]) {
      globalThis.window = { matchMedia(query) {
        assert.equal(query, '(hover: none) and (pointer: coarse)');
        return { matches: mobile };
      } };
      assert.equal(renderToStaticMarkup(React.createElement(LayoutProbe)), `<span>${mobile ? 'mobile' : 'desktop'}</span>`);
    }
    delete globalThis.window;
    assert.equal(renderToStaticMarkup(React.createElement(LayoutProbe)), '<span>desktop</span>');
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else delete globalThis.window;
  }
});

test('calendar actions hide Share while retaining Google, Outlook and ICS', () => {
  const html = render(GridCalendarActions, 'zen', '/en/grid', { event: null, cities: [], hours: [] });
  assert.ok(!html.includes('aria-label="Share event"'));
  assert.equal((html.match(/timelineGridCalendarButton/g) ?? []).length, 3);
  assert.equal((html.match(/ disabled=""/g) ?? []).length, 3);
  assert.ok(html.includes('aria-label="Create event in Outlook"'));
  assert.ok(html.includes('aria-label="Download event (.ics)"'));
});

test('mobile selection controls live only in the footer in both presentations', () => {
  for (const presentation of ['zen', 'embedded']) {
    const html = render(Mobile, presentation);
    const footer = html.indexOf('class="zenPageMobile-footer"');
    assert.ok(footer > 0);
    assert.ok(html.indexOf('aria-label="Select hours"') > footer);
    assert.equal((html.match(/aria-label="Select hours"/g) ?? []).length, 1);
    assert.equal((html.match(/timelineGridCalendarButton" type="button" disabled=""/g) ?? []).length, 3);
    assert.ok(html.indexOf('timelineGridCalendarButton') > footer);
  }
});

for (const [name, Component] of [['desktop', Desktop], ['mobile', Mobile]]) {
  for (const presentation of ['zen', 'embedded']) {
    test(`${name}/${presentation} renders independently with shared cells and the existing header structure`, () => {
      const html = render(Component, presentation);
      const header = name === 'desktop' ? 'widgetHeader' : 'zenPageMobile-header';
      for (const section of ['Start', 'Middle', 'End']) assert.ok(html.includes(`${header}${section}`));
      assert.equal(html.includes('widgetHeader-backdrop'), name === 'desktop');
      assert.equal(html.includes('widgetHeaderControlPlaceholder'), presentation === 'embedded');
      assert.equal(html.includes('aria-label="Pan"'), name === 'desktop');
      assert.ok(html.includes('aria-label="Select hours"'));
      if (name === 'desktop') {
        const footerIndex = html.indexOf('class="widgetFooter"');
        const actionsIndex = html.indexOf('timelineGridCalendarButton');
        assert.ok(footerIndex > 0 && actionsIndex > footerIndex);
        assert.equal((html.match(/timelineGridCalendarButton" type="button" disabled=""/g) ?? []).length, 3);
        assert.ok(html.indexOf('aria-label="Select hours"') > footerIndex);
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

  test(`${name} restores a shared event with identical selected hours and calendar dates`, () => {
    const start = Date.UTC(2026, 9, 26, 12);
    const city = { id: 'ny', city: 'New York', timezone: 'America/New_York',
      utcOffset: '', timeOffset: '', time: '', period: 'day', order: 0 };
    const hours = [0, 1, 2].map((offset) => ({ rowId: city.id, start: start + offset * 3600000 }));
    const url = buildGridEventUrl('https://timecross.app/en/grid', [city], hours);
    assert.ok(url);
    const html = render(Component, 'zen', url.replace('https://timecross.app', ''));
    assert.equal((html.match(/ isSelected/g) ?? []).length, 3);
    assert.ok(html.includes('20261026T120000Z%2F20261026T150000Z'));
    assert.ok(html.includes('aria-label="Create event in Outlook"'));
    assert.ok(html.includes('aria-label="Download event (.ics)"'));
    assert.ok(html.includes(`timelineGridSelectionFrame_${name}`));
    assert.equal((html.match(/data-grid-resize=/g) ?? []).length, 8);
    assert.ok(!html.includes('timelineGridSelectionLayer'));
    const contentStart = html.indexOf('class="timelineGrid-content"');
    const frameStart = html.indexOf(`class="timelineGridSelectionFrame timelineGridSelectionFrame_${name}"`);
    const hoursStart = html.indexOf(`class="timelineGrid-userHours timelineGrid-userHours_${name}"`);
    assert.ok(contentStart >= 0 && hoursStart > contentStart && frameStart > hoursStart);
    if (name === 'mobile') {
      const footer = html.indexOf('class="zenPageMobile-footer"');
      assert.ok(footer > 0);
      assert.ok(html.indexOf('timelineGridCalendarButton') > footer);
      assert.ok(html.indexOf('aria-label="Clear selection"') > footer);
      assert.ok(!html.includes('aria-label="Select hours"'));
      assert.ok(html.includes('lucide-x'));
      assert.equal((html.match(/aria-label="Create event in Outlook"/g) ?? []).length, 1);
    }
    if (name === 'desktop') {
      assert.ok(html.indexOf('timelineGridCalendarButton') > html.indexOf('class="widgetFooter"'));
      assert.equal((html.match(/timelineGridCalendarButton" type="button" disabled=""/g) ?? []).length, 0);
    }
  });
}
