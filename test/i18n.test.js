import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MESSAGES, LANGS, createI18n, detectLang } from '../src/i18n.js';

const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

test('both languages have exactly the same keys', () => {
  assert.deepEqual(LANGS, ['de', 'en']);
  assert.deepEqual(Object.keys(MESSAGES.de).sort(), Object.keys(MESSAGES.en).sort());
  assert.ok(Object.keys(MESSAGES.de).length > 50);
});

test('placeholders match between languages and no text is empty', () => {
  for (const key of Object.keys(MESSAGES.de)) {
    assert.equal(placeholders(MESSAGES.en[key]), placeholders(MESSAGES.de[key]), key);
    assert.ok(MESSAGES.de[key].trim() && MESSAGES.en[key].trim(), key);
  }
});

test('t replaces placeholders and falls back to the key', () => {
  const i18n = createI18n({ lang: 'en', messages: { en: { a: 'Hi {name}, {name}!' }, de: { a: 'Hallo {name}' } } });
  assert.equal(i18n.t('a', { name: 'Bo' }), 'Hi Bo, Bo!');
  assert.equal(i18n.t('missing.key'), 'missing.key');
  i18n.setLang('de');
  assert.equal(i18n.lang, 'de');
  assert.equal(i18n.t('a', { name: 'Bo' }), 'Hallo Bo');
  assert.throws(() => i18n.setLang('fr'));
});

test('detectLang', () => {
  assert.equal(detectLang({ stored: 'en', navigatorLanguages: ['de-DE'] }), 'en');
  assert.equal(detectLang({ stored: 'de', navigatorLanguages: ['en-US'] }), 'de');
  assert.equal(detectLang({ stored: 'xx', navigatorLanguages: ['de-AT'] }), 'de');
  assert.equal(detectLang({ navigatorLanguages: ['en-US', 'de'] }), 'en');
  assert.equal(detectLang({ navigatorLanguages: ['fr'] }), 'en');
  assert.equal(detectLang({ navigatorLanguages: [] }), 'en');
  assert.equal(detectLang({}), 'en');
});

test('*Html keys contain no placeholders (only fixed text goes through innerHTML)', () => {
  for (const lang of LANGS) {
    for (const [key, text] of Object.entries(MESSAGES[lang])) {
      if (key.endsWith('Html')) assert.doesNotMatch(text, /\{\w+\}/, `${lang} ${key}`);
    }
  }
});
