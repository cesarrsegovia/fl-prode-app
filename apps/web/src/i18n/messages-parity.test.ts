import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { defaultLocale, locales } from './config';

/**
 * Paridad de catálogos: `en` es la fuente de verdad. Cada otro idioma debe
 * tener EXACTAMENTE las mismas claves (mismos namespaces, mismas keys
 * anidadas). Una clave faltante saldría en runtime como MISSING_MESSAGE; una
 * clave de más es traducción muerta. Este test corta ambas en CI.
 */
const MESSAGES_DIR = fileURLToPath(new URL('../messages', import.meta.url));

type Json = Record<string, unknown>;

function flattenKeys(obj: Json, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === 'object' && !Array.isArray(value)
      ? flattenKeys(value as Json, path)
      : [path];
  });
}

function loadNamespace(locale: string, namespace: string): Json {
  const file = `${MESSAGES_DIR}/${locale}/${namespace}`;
  return JSON.parse(readFileSync(file, 'utf-8'));
}

function namespacesFor(locale: string): string[] {
  return readdirSync(`${MESSAGES_DIR}/${locale}`)
    .filter((f) => f.endsWith('.json'))
    .sort();
}

const sourceNamespaces = namespacesFor(defaultLocale);
const otherLocales = locales.filter((l) => l !== defaultLocale);

describe(`message catalogs match '${defaultLocale}' (source of truth)`, () => {
  for (const locale of otherLocales) {
    it(`${locale} has the same namespace files as ${defaultLocale}`, () => {
      expect(namespacesFor(locale)).toEqual(sourceNamespaces);
    });

    for (const namespace of sourceNamespaces) {
      it(`${locale}/${namespace} has the same keys as ${defaultLocale}`, () => {
        const sourceKeys = flattenKeys(
          loadNamespace(defaultLocale, namespace),
        ).sort();
        const targetKeys = flattenKeys(
          loadNamespace(locale, namespace),
        ).sort();
        expect(targetKeys).toEqual(sourceKeys);
      });
    }
  }
});
