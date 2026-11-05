import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { resolveTimelineGridLayout } from '../src/components/TimelineGrid/layout.ts';

// Import boundaries between desktop/, mobile/ and shared/ are enforced by ESLint
// (no-restricted-imports in eslint.config.js). Markup structure is covered by plannerRendering.test.mjs.

test('automatic layout follows input capabilities; explicit layout ignores the device', () => {
  assert.equal(resolveTimelineGridLayout('auto', false), 'desktop');
  assert.equal(resolveTimelineGridLayout('auto', true), 'mobile');

  for (const touch of [true, false]) {
    assert.equal(resolveTimelineGridLayout('desktop', touch), 'desktop');
    assert.equal(resolveTimelineGridLayout('mobile', touch), 'mobile');
  }
});

/** Class names with a _desktop or _mobile modifier that a stylesheet styles (comments and url() ignored). */
function getLayoutModifierClasses(path) {
  const css = readFileSync(new URL(`../src/components/TimelineGrid/${path}`, import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/url\([^)]*\)/g, '');

  return [...new Set(css.match(/\.[\w-]+_(?:desktop|mobile)\b/g) ?? [])];
}

test('each stylesheet styles only its own layout', () => {
  assert.deepEqual(getLayoutModifierClasses('desktop/style.css').filter((name) => name.endsWith('_mobile')), []);
  assert.deepEqual(getLayoutModifierClasses('mobile/style.css').filter((name) => name.endsWith('_desktop')), []);
  assert.deepEqual(getLayoutModifierClasses('shared/style.css'), []);
  assert.deepEqual(getLayoutModifierClasses('shared/selection.css'), []);
});
