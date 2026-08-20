import { describe, expect, it } from 'vitest'
import en from '../../messages/en.json'
import sr from '../../messages/sr.json'
import { LOCALES } from './locale'

type Messages = Record<string, unknown>

function flatten(value: Messages, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return child !== null && typeof child === 'object'
      ? flatten(child as Messages, path)
      : [path]
  })
}

/** Placeholders like {year} must match, or one language silently renders a literal. */
function placeholders(value: Messages, prefix = ''): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (child !== null && typeof child === 'object') {
      Object.assign(out, placeholders(child as Messages, path))
    } else if (typeof child === 'string') {
      out[path] = [...child.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()
    }
  }
  return out
}

describe('message catalogs', () => {
  it('covers every configured locale', () => {
    expect([...LOCALES].sort()).toEqual(['en', 'sr'])
  })

  it('defines exactly the same keys in both languages', () => {
    const srKeys = flatten(sr).sort()
    const enKeys = flatten(en).sort()

    expect(enKeys.filter((key) => !srKeys.includes(key))).toEqual([])
    expect(srKeys.filter((key) => !enKeys.includes(key))).toEqual([])
  })

  it('uses the same placeholders for a given key in both languages', () => {
    const srPlaceholders = placeholders(sr)
    const enPlaceholders = placeholders(en)

    for (const [key, expected] of Object.entries(srPlaceholders)) {
      expect(enPlaceholders[key], `placeholders differ for "${key}"`).toEqual(expected)
    }
  })

  it('leaves no message empty', () => {
    for (const [locale, catalog] of [
      ['sr', sr],
      ['en', en],
    ] as const) {
      for (const key of flatten(catalog)) {
        const value = key
          .split('.')
          .reduce<unknown>((node, part) => (node as Messages)[part], catalog)
        expect(String(value).trim(), `${locale}.${key} is empty`).not.toBe('')
      }
    }
  })
})
