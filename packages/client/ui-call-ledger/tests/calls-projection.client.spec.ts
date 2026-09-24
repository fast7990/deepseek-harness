/** Pure call-ledger projection over engine facts. */

import type {
  AssistantMessageNode, ConversationNode, RequestView, RunningToolCall, ToolResultNode,
} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { describe, expect, it } from 'vitest'
import type { CallLedgerSource, ConversationLocationFacts } from '../src/client/calls-projection.ts'
import { EMPTY_CALLS_SNAPSHOT, contentText, projectCalls, readCallTokens } from '../src/client/calls-projection.ts'

const TOOL = { name: 'bash', description: 'Run a command', parameters: {} }

/** One source carrying no engine facts unless a case supplies them. */
function source(overrides: Partial<CallLedgerSource> = {}): CallLedgerSource {
  return {
    eventNodes: [],
    eventLocations: new Map(),
    requests: [],
    runningCalls: [],
    ...overrides,
  }
}

function assistant(overrides: Partial<AssistantMessageNode> = {}): AssistantMessageNode {
  return { kind: 'assistant', seq: 10, time: 2_000, turn: 1, step: 1, blocks: [], ...overrides }
}

function call(overrides: Partial<Extract<RequestView, { purpose: 'assistant' }>> = {}): RequestView {
  return {
    purpose: 'assistant',
    startSeq: 5,
    startedAt: 1_000,
    completedAt: 3_000,
    status: 'complete',
    turn: 1,
    step: 1,
    ...overrides,
  }
}

function user(seq: number, text: string): ConversationNode {
  return { kind: 'user', seq, time: 100, content: [{ type: 'text', text }], source: undefined }
}

/** A node no ledger branch claims. */
function unclaimed(seq: number): ConversationNode {
  return { kind: 'unknown', seq, time: 100, type: 'test/unclaimed', data: null }
}

function result(callId: string, overrides: Partial<ToolResultNode> = {}): ToolResultNode {
  return {
    kind: 'tool-result',
    seq: 20,
    time: 2_500,
    callId,
    call: { name: 'bash', argsRaw: '{"command":"ls"}' },
    callTime: 2_000,
    content: [{ type: 'text', text: 'done' }],
    isError: false,
    subCalls: [],
    ...overrides,
  }
}

function running(callId: string, overrides: Partial<RunningToolCall> = {}): RunningToolCall {
  return {
    callId, name: 'bash', argsRaw: '{}', turn: 1, step: 1, time: 2_000, subCalls: [], ...overrides,
  }
}

function locations(entries: readonly (readonly [number, ConversationLocationFacts])[]): ReadonlyMap<number, ConversationLocationFacts> {
  return new Map(entries)
}

const AT_TURN_ONE = locations([[1, { kind: 'step', turn: { turn: 1 } }]])

describe('readCallTokens', () => {
  it('returns null when the value carries no provider counters', () => {
    expect(readCallTokens(undefined)).toBeNull()
    expect(readCallTokens('report')).toBeNull()
    expect(readCallTokens({})).toBeNull()
    expect(readCallTokens({ inputTokens: Number.NaN })).toBeNull()
  })

  it('reads every counter and derives the uncached input', () => {
    expect(readCallTokens({
      inputTokens: 100,
      cacheReadTokens: 40,
      cacheWriteTokens: 5,
      outputTokens: 10,
      reasoningTokens: 3,
    })).toEqual({ input: 100, cached: 40, uncached: 60, cacheWrite: 5, output: 10, reasoning: 3 })
  })

  it('never reports a negative uncached count', () => {
    expect(readCallTokens({ inputTokens: 10, cacheReadTokens: 25 })?.uncached).toBe(0)
  })

  it('leaves the uncached count unknown without an input total', () => {
    expect(readCallTokens({ outputTokens: 4 })).toEqual({
      input: null,
      cached: null,
      uncached: null,
      cacheWrite: null,
      output: 4,
      reasoning: null,
    })
  })
})

describe('contentText', () => {
  it('joins only the blocks that carry a non-empty text string', () => {
    expect(contentText([{ text: 'a' }, { text: '' }, { text: 7 }, { other: 1 }, null, 'raw', 5])).toBe('a')
  })

  it('returns one empty string without text blocks', () => {
    expect(contentText([])).toBe('')
  })
})

describe('projectCalls', () => {
  it('publishes one stable empty ledger before the target materializes', () => {
    expect(projectCalls(undefined)).toBe(EMPTY_CALLS_SNAPSHOT)
  })

  it('publishes an empty ledger for a materialized target with no calls', () => {
    const ledger = projectCalls(source())
    expect(ledger.turns).toEqual([])
    expect(ledger.totals).toEqual({ turns: 0, modelCalls: 0, toolCalls: 0, elapsedMs: null })
  })

  it('projects a completed call with its prompt, response, tokens, and settled tool', () => {
    const ledger = projectCalls(source({
      eventNodes: [
        user(1, 'run the tests'),
        assistant({
          blocks: [
            { kind: 'text', text: 'working' },
            { kind: 'reasoning', text: 'because' },
            { kind: 'tool-call', callId: 't1', name: 'bash', argsRaw: '{ "command": "npm test" }' },
            { kind: 'other', block: null },
          ],
        }),
        result('t1'),
        unclaimed(30),
      ],
      eventLocations: AT_TURN_ONE,
      requests: [
        {
          purpose: 'compaction',
          startSeq: 0,
          startedAt: 0,
          completedAt: 5,
          status: 'complete',
          turn: null,
          step: 0,
        },
        call({
          usage: { inputTokens: 100, cacheReadTokens: 40, outputTokens: 7 },
          prompt: {
            config: { provider: 'deepseek', model: 'deepseek-chat' },
            system: 'be brief',
            tools: [TOOL],
          },
        }),
      ],
    }))

    expect(ledger.totals).toEqual({ turns: 1, modelCalls: 1, toolCalls: 1, elapsedMs: 2_000 })
    const turn = ledger.turns[0]
    expect(turn?.title).toBe('run the tests')
    const card = turn?.calls[0]
    expect(card?.index).toBe(1)
    expect(card?.turn).toBe(1)
    expect(card?.step).toBe(1)
    expect(card?.startSeq).toBe(5)
    expect(card?.startedAt).toBe(1_000)
    expect(card?.completedAt).toBe(3_000)
    expect(card?.durationMs).toBe(2_000)
    expect(card?.status).toBe('complete')
    expect(card?.error).toBeNull()
    expect(card?.request).toEqual({
      provider: 'deepseek',
      model: 'deepseek-chat',
      hasSystem: true,
      messageCount: 1,
      toolDefinitionCount: 1,
    })
    expect(card?.response).toEqual({
      text: 'working',
      reasoningCharacters: 7,
      contentCharacters: 7,
      toolCallCount: 1,
    })
    expect(card?.tokens.uncached).toBe(60)
    expect(card?.tools[0]).toEqual({
      callId: 't1',
      name: 'bash',
      argsPreview: '{"command":"ls"}',
      resultPreview: 'done',
      status: 'complete',
      durationMs: 500,
    })
  })

  it('falls back to the assistant-recorded usage, metadata identity, and a null completion', () => {
    const ledger = projectCalls(source({
      eventNodes: [
        assistant({
          usage: { inputTokens: 9, outputTokens: 2 },
          blocks: [{ kind: 'tool-call', callId: 't1', name: 'bash', argsRaw: '{}' }],
        }),
        result('t1', { isError: true, call: null, callTime: null, seq: 99, time: 3_000 }),
      ],
      requests: [{
        purpose: 'assistant',
        startSeq: 5,
        startedAt: 1_000,
        completedAt: null,
        status: 'running',
        turn: 1,
        step: 1,
        error: 'boom',
        providerMetadata: { provider: 'p', model: 'm' },
      }],
    }))

    const card = ledger.turns[0]?.calls[0]
    expect(card?.durationMs).toBeNull()
    expect(card?.status).toBe('running')
    expect(card?.error).toBe('boom')
    expect(card?.request).toMatchObject({
      provider: 'p', model: 'm', hasSystem: false, toolDefinitionCount: 0,
    })
    expect(card?.response.text).toBe('')
    expect(card?.tokens.output).toBe(2)
    expect(card?.tools[0]).toEqual({
      callId: 't1',
      name: 'bash',
      argsPreview: '{}',
      resultPreview: 'done',
      status: 'error',
      durationMs: 1_000,
    })
    expect(ledger.totals.elapsedMs).toBe(0)
  })

  it('reports a call that has no assistant record and an in-flight tool', () => {
    const ledger = projectCalls(source({ requests: [call()], runningCalls: [running('t3')] }))
    expect(ledger.turns[0]?.calls[0]?.response).toEqual({
      text: '',
      reasoningCharacters: 0,
      contentCharacters: 0,
      toolCallCount: 1,
    })
    expect(ledger.turns[0]?.calls[0]?.tokens).toEqual({
      input: null,
      cached: null,
      uncached: null,
      cacheWrite: null,
      output: null,
      reasoning: null,
    })
    expect(ledger.turns[0]?.calls[0]?.tools).toEqual([{
      callId: 't3',
      name: 'bash',
      argsPreview: '{}',
      resultPreview: '',
      status: 'running',
      durationMs: null,
    }])
  })

  it('keeps a repeated tool call once and ignores an in-flight call from another step', () => {
    const ledger = projectCalls(source({
      eventNodes: [assistant({
        blocks: [
          { kind: 'tool-call', callId: 't1', name: 'bash', argsRaw: '{}' },
          { kind: 'tool-call', callId: 't1', name: 'bash', argsRaw: '{}' },
        ],
      })],
      requests: [call()],
      runningCalls: [running('t1'), running('t9', { turn: 4, step: 4 })],
    }))
    expect(ledger.turns[0]?.calls[0]?.tools).toEqual([{
      callId: 't1',
      name: 'bash',
      argsPreview: '{}',
      resultPreview: '',
      status: 'running',
      durationMs: null,
    }])
  })

  it('keeps the first named opening message per turn and caps a long one', () => {
    const long = 'x'.repeat(250)
    const ledger = projectCalls(source({
      eventNodes: [
        user(1, '   '),
        user(2, 'first'),
        user(3, 'second'),
        user(4, long),
        user(5, 'no location'),
        user(6, 'no turn'),
        user(7, 'session scope'),
      ],
      eventLocations: locations([
        [1, { kind: 'step', turn: { turn: 1 } }],
        [2, { kind: 'step', turn: { turn: 1 } }],
        [3, { kind: 'step', turn: { turn: 1 } }],
        [4, { kind: 'turn', turn: { turn: 2 } }],
        [6, { kind: 'step' }],
        [7, { kind: 'session' }],
      ]),
      requests: [call({ startSeq: 9 }), call({ startSeq: 9, turn: 2 })],
    }))
    expect(ledger.turns.map(turn => turn.title)).toEqual(['first', long.slice(0, 200)])
    expect(ledger.totals).toMatchObject({ turns: 2, modelCalls: 2, toolCalls: 0 })
  })

  it('groups several calls of one turn in log order', () => {
    const ledger = projectCalls(source({
      requests: [call({ startSeq: 1 }), call({ startSeq: 50, step: 2 })],
    }))
    expect(ledger.turns).toHaveLength(1)
    expect(ledger.turns[0]?.calls.map(entry => entry.index)).toEqual([1, 2])
    expect(ledger.totals).toMatchObject({ turns: 1, modelCalls: 2 })
  })
})
