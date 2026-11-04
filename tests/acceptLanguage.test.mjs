import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getLanguageFromAcceptLanguage } from '../src/i18n/languageRouting.ts';

test('falls back to English without a header', () => {
  assert.equal(getLanguageFromAcceptLanguage(null), 'en');
  assert.equal(getLanguageFromAcceptLanguage(''), 'en');
});

test('picks the highest-quality supported language', () => {
  assert.equal(getLanguageFromAcceptLanguage('ja, de-DE;q=0.8, fr;q=0.9'), 'fr');
  assert.equal(getLanguageFromAcceptLanguage('pt-BR,pt;q=0.9,en;q=0.5'), 'pt');
  assert.equal(getLanguageFromAcceptLanguage('UK-ua'), 'uk');
});

test('skips languages marked as not acceptable', () => {
  assert.equal(getLanguageFromAcceptLanguage('ru;q=0, es;q=0.1'), 'es');
  assert.equal(getLanguageFromAcceptLanguage('de;q=0'), 'en');
});

test('tolerates spaces and extra parameters', () => {
  assert.equal(getLanguageFromAcceptLanguage('xx, es ; q=0.7'), 'es');
});
