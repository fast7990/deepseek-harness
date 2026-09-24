/** One model call presented as a REQUEST / RESPONSE / tools card. */

import type { CallCard as CallCardModel, CallTokens, CallToolCard } from './calls-contract.ts'
import { formatClock, formatCount, formatDuration } from './format.ts'
import type { CallLedgerKey, CallLedgerTranslate } from './locales.ts'
import css from './views.module.css'

/** Props for one model-call card. */
export interface CallCardViewProps {
  /** The call to present. */
  readonly call: CallCardModel
  /** Namespace-bound translator. */
  readonly t: CallLedgerTranslate
}

function statusKey(status: CallCardModel['status']): CallLedgerKey {
  switch (status) {
    case 'running': return 'call.status.running'
    case 'complete': return 'call.status.complete'
    case 'error': return 'call.status.error'
  }
}

function toolStatusKey(status: CallToolCard['status']): CallLedgerKey {
  switch (status) {
    case 'running': return 'tool.running'
    case 'complete': return 'call.status.complete'
    case 'error': return 'tool.error'
  }
}

const TOKEN_FIELDS: readonly {
  readonly key: string
  readonly label: CallLedgerKey
  readonly read: (tokens: CallTokens) => number | null
}[] = [
  { key: 'input', label: 'token.input', read: tokens => tokens.input },
  { key: 'uncached', label: 'token.uncached', read: tokens => tokens.uncached },
  { key: 'cached', label: 'token.cached', read: tokens => tokens.cached },
  { key: 'cacheWrite', label: 'token.cacheWrite', read: tokens => tokens.cacheWrite },
  { key: 'output', label: 'token.output', read: tokens => tokens.output },
  { key: 'reasoning', label: 'token.reasoning', read: tokens => tokens.reasoning },
]

function TokenRow({ tokens, t }: { readonly tokens: CallTokens; readonly t: CallLedgerTranslate }) {
  const present = TOKEN_FIELDS.flatMap((field) => {
    const value = field.read(tokens)
    return value === null ? [] : [{ key: field.key, label: t(field.label), value: formatCount(value) }]
  })
  if (present.length === 0) {
    return <p className={css.tokenEmpty}>{t('token.unreported')}</p>
  }
  return (
    <dl className={css.tokens}>
      {present.map(item => (
        <div key={item.key} className={css.tokenItem}>
          <dt className={css.tokenLabel}>{item.label}</dt>
          <dd className={css.tokenValue}>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function ToolRow({ tool, t }: { readonly tool: CallToolCard; readonly t: CallLedgerTranslate }) {
  return (
    <li className={css.tool}>
      <div className={css.toolHead}>
        <span className={css.toolName}>{tool.name}</span>
        <span className={css.toolStatus}>{t(toolStatusKey(tool.status))}</span>
        <span className={css.toolDuration}>{formatDuration(tool.durationMs, t)}</span>
      </div>
      {tool.argsPreview === '' ? null : <p className={css.toolArgs}>{tool.argsPreview}</p>}
      {tool.resultPreview === '' ? null : <p className={css.toolResult}>{tool.resultPreview}</p>}
    </li>
  )
}

/**
 * Render one model call as a REQUEST / RESPONSE / tools card.
 * @param props - the call and translator.
 * @returns the card element.
 */
export function CallCardView({ call, t }: CallCardViewProps) {
  return (
    <article className={css.card}>
      <header className={css.cardHead}>
        <h4 className={css.cardTitle}>{t('call.title', { index: call.index })}</h4>
        <span className={css.cardTime}>{formatClock(call.startedAt)}</span>
        <span className={css.cardDuration}>{formatDuration(call.durationMs, t)}</span>
        <span className={`${css.cardStatus} ${css[`status_${call.status}`]}`}>
          {t(statusKey(call.status))}
        </span>
      </header>
      <TokenRow tokens={call.tokens} t={t} />
      <div className={css.cardBody}>
        <section className={css.pane}>
          <h5 className={css.paneTitle}>{t('section.request')}</h5>
          <p className={css.paneModel}>{call.request.model ?? t('request.unknownModel')}</p>
          <ul className={css.facts}>
            <li>{t('request.system')} {formatCount(call.request.hasSystem ? 1 : 0)}</li>
            <li>{t('request.messages')} {formatCount(call.request.messageCount)}</li>
            <li>{t('request.toolDefinitions')} {formatCount(call.request.toolDefinitionCount)}</li>
          </ul>
        </section>
        <section className={css.pane}>
          <h5 className={css.paneTitle}>{t('section.response')}</h5>
          <p className={css.paneText}>{call.response.text === '' ? t('response.empty') : call.response.text}</p>
          <ul className={css.facts}>
            <li>{t('response.reasoning')} {formatCount(call.response.reasoningCharacters)}</li>
            <li>{t('response.content')} {formatCount(call.response.contentCharacters)}</li>
            <li>{t('response.toolCalls')} {formatCount(call.response.toolCallCount)}</li>
          </ul>
        </section>
      </div>
      <section className={css.pane}>
        <h5 className={css.paneTitle}>{t('section.tools')}</h5>
        {call.tools.length === 0
          ? <p className={css.paneText}>{t('tool.none')}</p>
          : (
            <ul className={css.tools}>
              {call.tools.map(tool => <ToolRow key={tool.callId} tool={tool} t={t} />)}
            </ul>
          )}
      </section>
      {call.error === null ? null : <p className={css.error}>{t('call.error', { message: call.error })}</p>}
    </article>
  )
}
