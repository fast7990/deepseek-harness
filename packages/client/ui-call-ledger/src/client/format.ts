/** Locale-aware value formatting for the call ledger. */

import type { CallLedgerTranslate } from './locales.ts'

/**
 * Group an integer with thousands separators.
 * @param value - non-negative integer count.
 * @returns the grouped decimal string.
 */
export function formatCount(value: number): string {
  return String(Math.trunc(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * Format an epoch timestamp as a fixed 24-hour clock time.
 * @param epochMs - Unix epoch milliseconds.
 * @returns `HH:MM:SS` in the host's local zone.
 */
export function formatClock(epochMs: number): string {
  const date = new Date(epochMs)
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map(part => String(part).padStart(2, '0'))
    .join(':')
}

/**
 * Format a duration in milliseconds.
 * @param milliseconds - duration, or null when no duration is known.
 * @param t - call-ledger translator.
 * @returns a localized duration label.
 */
export function formatDuration(milliseconds: number | null, t: CallLedgerTranslate): string {
  if (milliseconds === null || !Number.isFinite(milliseconds)) return t('duration.unknown')
  if (milliseconds < 1000) return t('duration.ms', { value: String(Math.round(milliseconds)) })
  if (milliseconds < 60_000) return t('duration.s', { value: (milliseconds / 1000).toFixed(1) })
  const totalSeconds = Math.round(milliseconds / 1000)
  return t('duration.minutes', {
    minutes: String(Math.floor(totalSeconds / 60)),
    seconds: String(totalSeconds % 60).padStart(2, '0'),
  })
}
