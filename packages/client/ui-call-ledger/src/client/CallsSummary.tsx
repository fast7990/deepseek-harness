/** Summary strip above the call ledger. */

import type { CallTotals } from './calls-contract.ts'
import { formatCount, formatDuration } from './format.ts'
import type { CallLedgerTranslate } from './locales.ts'
import css from './views.module.css'

/** Props for the call-ledger summary strip. */
export interface CallsSummaryProps {
  /** Session-wide aggregates. */
  readonly totals: CallTotals
  /** Namespace-bound translator. */
  readonly t: CallLedgerTranslate
}

/**
 * Render the four aggregate counters shown above the ledger.
 * @param props - aggregates and translator.
 * @returns the summary element.
 */
export function CallsSummary({ totals, t }: CallsSummaryProps) {
  const items = [
    { key: 'turns', label: t('summary.turns'), value: formatCount(totals.turns) },
    { key: 'modelCalls', label: t('summary.modelCalls'), value: formatCount(totals.modelCalls) },
    { key: 'toolCalls', label: t('summary.toolCalls'), value: formatCount(totals.toolCalls) },
    { key: 'elapsed', label: t('summary.elapsed'), value: formatDuration(totals.elapsedMs, t) },
  ]
  return (
    <dl className={css.summary}>
      {items.map(item => (
        <div key={item.key} className={css.summaryItem}>
          <dd className={css.summaryValue}>{item.value}</dd>
          <dt className={css.summaryLabel}>{item.label}</dt>
        </div>
      ))}
    </dl>
  )
}
