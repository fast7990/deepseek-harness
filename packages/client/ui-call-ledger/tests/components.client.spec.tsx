// @vitest-environment jsdom
/** Call-ledger presentation: summary strip, call cards, and the ledger view. */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  CallCard as CallCardModel, CallTokens, CallsSnapshot,
} from '../src/client/calls-contract.ts'
import { CallCardView } from '../src/client/CallCardView.tsx'
import { CallsSummary } from '../src/client/CallsSummary.tsx'
import { CallsView } from '../src/client/CallsView.tsx'
import { t } from './locale.client.ts'

afterEach(() => { cleanup() })

const NO_TOKENS: CallTokens = {
  input: null,
  cached: null,
  uncached: null,
  cacheWrite: null,
  output: null,
  reasoning: null,
}

function card(overrides: Partial<CallCardModel> = {}): CallCardModel {
  return {
    index: 1,
    turn: 1,
    step: 1,
    startSeq: 5,
    startedAt: new Date(2024, 0, 2, 20, 3, 34).getTime(),
    completedAt: 3_000,
    durationMs: 2_000,
    status: 'complete',
    error: null,
    request: { provider: 'deepseek', model: 'deepseek-chat', hasSystem: true, messageCount: 3, toolDefinitionCount: 25 },
    response: { text: 'hello', reasoningCharacters: 7, contentCharacters: 5, toolCallCount: 1 },
    tokens: { input: 10_441, cached: 384, uncached: 10_057, cacheWrite: 12, output: 539, reasoning: 9 },
    tools: [{ callId: 't1', name: 'bash', argsPreview: 'ls', resultPreview: 'ok', status: 'complete', durationMs: 299 }],
    ...overrides,
  }
}

function ledger(overrides: Partial<CallsSnapshot> = {}): CallsSnapshot {
  return {
    turns: [{ turn: 1, title: 'run the tests', calls: [card()] }],
    totals: { turns: 1, modelCalls: 1, toolCalls: 1, elapsedMs: 327_000 },
    ...overrides,
  }
}

/** Props the framework would supply, reduced to the seats this view reads. */
function viewProps(
  snapshot: CallsSnapshot,
  loadOlder: () => Promise<boolean>,
): Parameters<typeof CallsView>[0] {
  type CallsViewProps = Parameters<typeof CallsView>[0]
  const useCalls: CallsViewProps['useCalls'] =
    <Selected,>(selector: (value: CallsSnapshot) => Selected) => selector(snapshot)
  return { useCalls, loadOlder, t } as CallsViewProps
}

describe('CallsSummary', () => {
  it('reports the four session aggregates', () => {
    render(<CallsSummary totals={{ turns: 1, modelCalls: 49, toolCalls: 1_234, elapsedMs: 327_000 }} t={t} />)
    expect(screen.getByText('User turns')).toBeDefined()
    expect(screen.getByText('1')).toBeDefined()
    expect(screen.getByText('49')).toBeDefined()
    expect(screen.getByText('1,234')).toBeDefined()
    expect(screen.getByText('Elapsed')).toBeDefined()
    expect(screen.getByText('5m27s')).toBeDefined()
  })
})

describe('CallCardView', () => {
  it('reports the request, response, tokens, and settled tool of one call', () => {
    render(<CallCardView call={card()} t={t} />)
    expect(screen.getByText('Model call #1')).toBeDefined()
    expect(screen.getByText('20:03:34')).toBeDefined()
    expect(screen.getAllByText('Completed')).toHaveLength(2)
    expect(screen.getByText('10,441')).toBeDefined()
    expect(screen.getByText('10,057')).toBeDefined()
    expect(screen.getByText('384')).toBeDefined()
    expect(screen.getByText('539')).toBeDefined()
    expect(screen.getByText('deepseek-chat')).toBeDefined()
    expect(screen.getByText('System 1')).toBeDefined()
    expect(screen.getByText('Messages 3')).toBeDefined()
    expect(screen.getByText('Tool definitions 25')).toBeDefined()
    expect(screen.getByText('hello')).toBeDefined()
    expect(screen.getByText('bash')).toBeDefined()
    expect(screen.getByText('ok')).toBeDefined()
  })

  it('names an unknown model and reports an empty response', () => {
    render(<CallCardView call={card({
      request: { provider: null, model: null, hasSystem: false, messageCount: 0, toolDefinitionCount: 0 },
      response: { text: '', reasoningCharacters: 0, contentCharacters: 0, toolCallCount: 0 },
      tools: [],
    })} t={t} />)
    expect(screen.getByText('Unknown model')).toBeDefined()
    expect(screen.getByText('(no content)')).toBeDefined()
    expect(screen.getByText('This call made no tool calls')).toBeDefined()
  })

  it('reports unreported usage when no provider counter exists', () => {
    render(<CallCardView call={card({ tokens: NO_TOKENS })} t={t} />)
    expect(screen.getByText('Usage not reported')).toBeDefined()
  })

  it('reports a running call with no settled tool', () => {
    render(<CallCardView call={card({ status: 'running', durationMs: null, tools: [] })} t={t} />)
    expect(screen.getByText('Running')).toBeDefined()
    expect(screen.getByText('This call made no tool calls')).toBeDefined()
  })

  it('reports a running tool, a failed tool, and the call error', () => {
    render(
      <CallCardView
        call={card({
          error: 'provider refused',
          tools: [
            { callId: 't1', name: 'bash', argsPreview: '', resultPreview: '', status: 'running', durationMs: null },
            { callId: 't2', name: 'write', argsPreview: 'x', resultPreview: 'no', status: 'error', durationMs: null },
          ],
        })}
        t={t}
      />,
    )
    expect(screen.getByText('Running')).toBeDefined()
    expect(screen.getByText('Failed')).toBeDefined()
    expect(screen.getByText('Error: provider refused')).toBeDefined()
    expect(screen.getAllByText('—')).toHaveLength(2)
  })

  it('reports a failed call status', () => {
    render(<CallCardView call={card({ status: 'error' })} t={t} />)
    expect(screen.getByText('Failed')).toBeDefined()
  })
})

describe('CallsView', () => {
  it('states that no call was recorded for an empty ledger', () => {
    const empty: CallsSnapshot = { turns: [], totals: { turns: 0, modelCalls: 0, toolCalls: 0, elapsedMs: null } }
    render(<CallsView {...viewProps(empty, async () => false)} />)
    expect(screen.getByText('No calls recorded')).toBeDefined()
    expect(screen.getByText('This session has no model calls yet.')).toBeDefined()
  })

  it('lists every turn and filters the cards to a selected turn', () => {
    const snapshot = ledger({
      turns: [
        { turn: 1, title: 'first', calls: [card({ startSeq: 5 })] },
        { turn: 2, title: '', calls: [card({ index: 2, turn: 2, startSeq: 50 })] },
      ],
      totals: { turns: 2, modelCalls: 2, toolCalls: 2, elapsedMs: 1_000 },
    })
    render(<CallsView {...viewProps(snapshot, async () => false)} />)

    const first = screen.getByRole('button', { name: /Turn 1/ })
    expect(screen.getByText('first')).toBeDefined()
    expect(screen.getByText('This session')).toBeDefined()
    expect(screen.getByText('Model call #1')).toBeDefined()
    expect(screen.getByText('Model call #2')).toBeDefined()

    fireEvent.click(first)
    expect(first.getAttribute('aria-pressed')).toBe('true')
    expect(screen.queryByText('Model call #2')).toBeNull()

    fireEvent.click(first)
    expect(first.getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByText('Model call #2')).toBeDefined()
  })

  it('loads the next older page and reports it while pending', async () => {
    let settle: (() => void) | undefined
    const loadOlder = vi.fn(() => new Promise<boolean>((resolve) => {
      settle = () => { resolve(true) }
    }))
    render(<CallsView {...viewProps(ledger(), loadOlder)} />)

    fireEvent.click(screen.getByRole('button', { name: 'Load earlier calls' }))
    expect(loadOlder).toHaveBeenCalledOnce()
    expect(screen.getByText('Loading…')).toBeDefined()

    settle?.()
    await waitFor(() => { expect(screen.getByText('Load earlier calls')).toBeDefined() })
  })
})
