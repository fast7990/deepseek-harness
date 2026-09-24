import { en as commonEn } from '@deepseek-ai/dsh-client-locale/src/locales/en.ts'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import { en, zh, type CallLedgerTranslate } from '../src/client/locales.ts'

function translator(dictionary: Record<string, string>): CallLedgerTranslate {
  return (key, params = {}) => {
    const template = dictionary[key] ?? key
    return template.replace(/\{(\w+)\}/g, (_match, name: string) => {
      const value = params[name]
      return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
        ? String(value)
        : ''
    })
  }
}

/** English call-ledger translator for component and pure-projection tests. */
export const t = translator({ ...commonEn, ...en })

/** Chinese call-ledger translator for cases that assert the shipped copy. */
export const tZh = translator({ ...commonZh, ...zh })
