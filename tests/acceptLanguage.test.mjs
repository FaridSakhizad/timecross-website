import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  MENU_LANGUAGES,
  getCanonicalLanguagePath,
  getLanguageFromAcceptLanguage,
  getLanguageFromUrlSegment,
  getLanguageMenuItems,
  getMenuLanguage,
  getPortugueseVariant,
} from '../src/i18n/languageRouting.ts';

test('falls back to English without a header', () => {
  assert.equal(getLanguageFromAcceptLanguage(null), 'en');
  assert.equal(getLanguageFromAcceptLanguage(''), 'en');
});

test('picks the highest-quality supported language', () => {
  assert.equal(getLanguageFromAcceptLanguage('ja, de-DE;q=0.8, fr;q=0.9'), 'fr');
  assert.equal(getLanguageFromAcceptLanguage('pt-PT,pt;q=0.9,en;q=0.5'), 'pt');
  assert.equal(getLanguageFromAcceptLanguage('UK-ua'), 'uk');
});

test('skips languages marked as not acceptable', () => {
  assert.equal(getLanguageFromAcceptLanguage('ru;q=0, es;q=0.1'), 'es');
  assert.equal(getLanguageFromAcceptLanguage('de;q=0'), 'en');
});

test('tolerates spaces and extra parameters', () => {
  assert.equal(getLanguageFromAcceptLanguage('xx, es ; q=0.7'), 'es');
});

test('Portuguese is Brazilian unless the tag says otherwise', () => {
  assert.equal(getLanguageFromAcceptLanguage('pt-BR,pt;q=0.9,en;q=0.5'), 'pt-BR');
  assert.equal(getLanguageFromAcceptLanguage('pt-PT,pt;q=0.9'), 'pt');
  assert.equal(getLanguageFromAcceptLanguage('pt-AO'), 'pt');
  assert.equal(getLanguageFromAcceptLanguage('pt'), 'pt-BR');
  assert.equal(getLanguageFromAcceptLanguage('pt, pt-PT;q=0.8'), 'pt');
});

test('the Portuguese variant follows the regional tag, then the time zone', () => {
  assert.equal(getPortugueseVariant(['en-US', 'pt-BR'], 'Europe/Lisbon'), 'pt-BR');
  assert.equal(getPortugueseVariant(['pt-PT'], 'America/Sao_Paulo'), 'pt');
  assert.equal(getPortugueseVariant(['pt'], 'Europe/Lisbon'), 'pt');
  assert.equal(getPortugueseVariant(['en-US'], 'Africa/Luanda'), 'pt');
  assert.equal(getPortugueseVariant(['en-US'], 'America/Edmonton'), 'pt-BR');
  assert.equal(getPortugueseVariant([], null), 'pt-BR');
});

test('pt-br URLs map to Brazilian Portuguese and back', () => {
  assert.equal(getLanguageFromUrlSegment('pt-br'), 'pt-BR');
  assert.equal(getLanguageFromUrlSegment('pt-BR'), 'pt-BR');
  assert.equal(getCanonicalLanguagePath('pt-BR', '/grid'), '/pt-br/grid');
  assert.equal(getMenuLanguage('pt-BR'), 'pt');
  assert.ok(!MENU_LANGUAGES.includes('pt-BR'));
});

test('in Portuguese, the menu offers the other variant in place of Portuguese', () => {
  const items = (language) => getLanguageMenuItems(language).map((item) => `${item.language}:${item.labelKey}`);

  assert.deepEqual(items('pt'), [
    'en:languages.en',
    'fr:languages.fr',
    'uk:languages.uk',
    'ru:languages.ru',
    'es:languages.es',
    'pt-BR:languages.ptBR',
    'de:languages.de',
  ]);
  assert.ok(items('pt-BR').includes('pt:languages.ptPT'));
  assert.equal(items('de').filter((item) => item.endsWith('languages.pt')).length, 1);
});
