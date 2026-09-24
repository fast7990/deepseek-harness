/** Workflow view: per-turn model-call ledger with session totals. */

import { useCallback, useMemo, useState } from 'react'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { CallsSnapshot } from './calls-contract.ts'
import { CallCardView } from './CallCardView.tsx'
import { CallsSummary } from './CallsSummary.tsx'
import css from './views.module.css'

/** Injected face for the call ledger. */
export interface CallsViewInjected {
  /** Registrant-private ledger source, bound to this view as its `useCalls` selector hook. */
  readonly hooks: {
    readonly calls: ObservableSnapshot<CallsSnapshot>
  }
  /**
   * Load the next older history page.
   * @returns whether the loaded window changed.
   */
  readonly loadOlder: () => Promise<boolean>
}

/**
 * Render the call ledger.
 * @param props - framework shares, the injected history loader, and the translator.
 * @returns the ledger element.
 */
export function CallsView({
  useCalls, loadOlder, t,
}: PropsRuntime<'conversation.view'> & InjectFace<CallsViewInjected> & PropsLocale<'callLedger'>) {
  const ledger = useCalls(snapshot => snapshot)
  const [selectedTurn, setSelectedTurn] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const visibleTurns = useMemo(
    () => selectedTurn === null
      ? ledger.turns
      : ledger.turns.filter(turn => turn.turn === selectedTurn),
    [ledger, selectedTurn],
  )

  const onLoadOlder = useCallback(() => {
    setLoading(true)
    void loadOlder().finally(() => { setLoading(false) })
  }, [loadOlder])

  if (ledger.turns.length === 0) {
    return (
      <div className={css.view} role="region" aria-label={t('a11y.region')}>
        <div className={css.empty}>
          <p className={css.emptyTitle}>{t('empty.title')}</p>
          <p className={css.emptyDescription}>{t('empty.description')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={css.view} role="region" aria-label={t('a11y.region')}>
      <CallsSummary totals={ledger.totals} t={t} />
      <div className={css.body}>
        <nav className={css.turnList} aria-label={t('summary.turns')}>
          {ledger.turns.map(turn => (
            <button
              key={turn.turn}
              type="button"
              className={selectedTurn === turn.turn ? `${css.turnItem} ${css.turnItemActive}` : css.turnItem}
              aria-pressed={selectedTurn === turn.turn}
              onClick={() => { setSelectedTurn(current => (current === turn.turn ? null : turn.turn)) }}
            >
              <span className={css.turnName}>{t('turn.label', { turn: turn.turn })}</span>
              <span className={css.turnTitle}>{turn.title === '' ? t('turn.untitled') : turn.title}</span>
              <span className={css.turnMeta}>{turn.calls.length}</span>
            </button>
          ))}
        </nav>
        <div className={css.calls}>
          {visibleTurns.map(turn => (
            <section key={turn.turn} className={css.turnSection}>
              <h3 className={css.turnHeading}>{t('turn.label', { turn: turn.turn })}</h3>
              {turn.calls.map(call => <CallCardView key={call.startSeq} call={call} t={t} />)}
            </section>
          ))}
        </div>
      </div>
      <button type="button" className={css.loadOlder} onClick={onLoadOlder} disabled={loading}>
        {loading ? t('loadOlder.pending') : t('loadOlder')}
      </button>
    </div>
  )
}
