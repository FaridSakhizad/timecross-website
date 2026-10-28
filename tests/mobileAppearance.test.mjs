import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import postcss from 'postcss';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('mobile background has a fixed image layer with an older viewport-unit fallback', () => {
  const css = postcss.parse(read('src/index.css'));
  const mobile = css.nodes.find((node) => node.type === 'atrule'
    && node.name === 'media' && node.params === '(hover: none) and (pointer: coarse)');
  assert.ok(mobile);
  const layer = mobile.nodes.find((node) => node.selector === 'body::before');
  assert.ok(layer);
  const values = (property) => layer.nodes.filter((node) => node.prop === property).map((node) => node.value);
  assert.deepEqual(values('position'), ['fixed']);
  assert.deepEqual(values('height'), ['100vh', '100lvh']);
  assert.deepEqual(values('pointer-events'), ['none']);
  assert.deepEqual(values('z-index'), ['-1']);
  assert.ok(values('background')[0].includes('bg--mob-main-1.jpg'));
  assert.ok(mobile.nodes.some((node) => node.selector === 'html[data-color-mode="night"] body::before'));
});

test('static and SSR heads provide the same mobile tint before the generic desktop fallback', () => {
  const mobile = '<meta name="theme-color" content="#e9a27e" media="(hover: none) and (pointer: coarse)" data-managed-seo="true" />';
  const fallback = '<meta name="theme-color" content="#f2d85f" data-managed-seo="true" />';
  for (const path of ['index.html', 'server/index.ts']) {
    const source = read(path);
    assert.ok(source.includes(mobile), path);
    assert.ok(source.indexOf(fallback) > source.indexOf(mobile), path);
  }
  assert.ok(read('index.html').includes('viewport-fit=cover'));
});
