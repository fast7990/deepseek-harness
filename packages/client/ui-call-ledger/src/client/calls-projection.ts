/** Pure projection from the Trajectory target snapshot into the call ledger. */

import type {
  AssistantMessageNode, ConversationNode, RequestView, RunningToolCall, ToolResultNode,
} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {
  CallCard, CallTokens, CallToolCard, CallTurn, CallsSnapshot,
} from './calls-contract.ts'

/** Placement facts the ledger reads from an engine-owned Conversation location. */
export interface ConversationLocationFacts {
  readonly kind: string
  readonly turn?: { readonly turn: number }
}

/** Engine facts the call ledger projects from. The Trajectory snapshot satisfies this structure. */
export interface CallLedgerSource {
  readonly eventNodes: readonly ConversationNode[]
  readonly eventLocations: ReadonlyMap<number, ConversationLocationFacts>
  readonly requests: readonly RequestView[]
  readonly runningCalls: readonly RunningToolCall[]
}

const MAX_TITLE_LENGTH = 200
const EMPTY_TURNS: readonly CallTurn[] = []

/** Token accounting reported when the provider reported none. */
const UNREPORTED_TOKENS: CallTokens = {
  input: null,
  cached: null,
  uncached: null,
  cacheWrite: null,
  output: null,
  reasoning: null,
}

/** Stable empty ledger used until a Session has recorded calls. */
export const EMPTY_CALLS_SNAPSHOT: CallsSnapshot = {
  turns: EMPTY_TURNS,
  totals: { turns: 0, modelCalls: 0, toolCalls: 0, elapsedMs: null },
}

function stepKey(turn: number, step: number): string {
  return `${turn}\u0000${step}`
}

function readNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/**
 * Read provider usage counters from a durable value recorded as unknown.
 * @param value - usage carried by a request view or assistant message node.
 * @returns the recorded counters, or null when the value carries none.
 */
export function readCallTokens(value: unknown): CallTokens | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  const input = readNumber(record, 'inputTokens')
  const cached = readNumber(record, 'cacheReadTokens')
  const cacheWrite = readNumber(record, 'cacheWriteTokens')
  const output = readNumber(record, 'outputTokens')
  const reasoning = readNumber(record, 'reasoningTokens')
  if (input === null && cached === null && cacheWrite === null && output === null && reasoning === null) {
    return null
  }
  return {
    input,
    cached,
    cacheWrite,
    output,
    reasoning,
    uncached: input === null ? null : Math.max(0, input - (cached ?? 0)),
  }
}

function blockText(block: unknown): string {
  if (typeof block !== 'object' || block === null) return ''
  const text = (block as { text?: unknown }).text
  return typeof text === 'string' ? text : ''
}

/**
 * Join the text of every text-bearing block in recorded content order.
 * @param content - recorded content blocks, or any value read across a durable boundary.
 * @returns the newline-joined text of the blocks that carry one.
 */
export function contentText(content: readonly unknown[]): string {
  const parts: string[] = []
  for (const block of content) {
    const text = blockText(block)
    if (text !== '') parts.push(text)
  }
  return parts.join('\n')
}

/** Collapse whitespace and cap length for a single-line preview. */
function preview(text: string): string {
  const collapsed = text.replace(/\s+/g, ' ').trim()
  return collapsed.length <= MAX_TITLE_LENGTH ? collapsed : collapsed.slice(0, MAX_TITLE_LENGTH)
}

function locationTurn(location: ConversationLocationFacts | undefined): number | null {
  if (location === undefined) return null
  if (location.kind !== 'step' && location.kind !== 'turn') return null
  return location.turn?.turn ?? null
}

interface AssistantDigest {
  readonly text: string
  readonly reasoningCharacters: number
  readonly contentCharacters: number
  readonly calls: readonly { callId: string; name: string; argsRaw: string }[]
}

function digestAssistant(node: AssistantMessageNode): AssistantDigest {
  const texts: string[] = []
  const reasoning: string[] = []
  const calls: { callId: string; name: string; argsRaw: string }[] = []
  for (const block of node.blocks) {
    if (block.kind === 'text') texts.push(block.text)
    else if (block.kind === 'reasoning') reasoning.push(block.text)
    else if (block.kind === 'tool-call') {
      calls.push({ callId: block.callId, name: block.name, argsRaw: block.argsRaw })
    }
  }
  const text = texts.join('\n')
  return {
    text,
    reasoningCharacters: reasoning.join('\n').length,
    contentCharacters: text.length,
    calls,
  }
}

function toolCard(
  head: { readonly callId: string; readonly name: string; readonly argsRaw: string },
  result: ToolResultNode | undefined,
  assistantTime: number,
): CallToolCard {
  const name = result?.call?.name ?? head.name
  const argsPreview = preview(result?.call?.argsRaw ?? head.argsRaw)
  if (result === undefined) {
    return { callId: head.callId, name, argsPreview, resultPreview: '', status: 'running', durationMs: null }
  }
  return {
    callId: head.callId,
    name,
    argsPreview,
    resultPreview: preview(contentText(result.content)),
    status: result.isError ? 'error' : 'complete',
    durationMs: Math.max(0, result.time - (result.callTime ?? assistantTime)),
  }
}

function runningCard(call: RunningToolCall): CallToolCard {
  return {
    callId: call.callId,
    name: call.name,
    argsPreview: call.phase === 'preparing' ? '' : preview(call.argsRaw),
    resultPreview: '',
    status: 'running',
    durationMs: null,
  }
}

/**
 * Project engine facts into the call ledger.
 * @param snapshot - current Trajectory target snapshot, or undefined before it materializes.
 * @returns one turn group per recorded turn, with session-wide totals.
 */
export function projectCalls(snapshot: CallLedgerSource | undefined): CallsSnapshot {
  if (snapshot === undefined) return EMPTY_CALLS_SNAPSHOT
  const assistants = new Map<string, AssistantMessageNode>()
  const results = new Map<string, ToolResultNode>()
  const titles = new Map<number, string>()
  const messageSeqs: number[] = []
  for (const node of snapshot.eventNodes) {
    if (node.kind === 'tool-result') {
      results.set(node.callId, node)
      continue
    }
    if (node.kind === 'assistant') {
      assistants.set(stepKey(node.turn, node.step), node)
      messageSeqs.push(node.seq)
      continue
    }
    if (node.kind === 'user') {
      messageSeqs.push(node.seq)
      const turn = locationTurn(snapshot.eventLocations.get(node.seq))
      if (turn === null || titles.has(turn)) continue
      const text = preview(contentText(node.content))
      if (text !== '') titles.set(turn, text)
    }
  }

  const callsByTurn = new Map<number, CallCard[]>()
  let cursor = 0
  let precedingMessages = 0
  let index = 0
  let toolCalls = 0
  let earliest: number | null = null
  let latest: number | null = null

  for (const request of snapshot.requests) {
    if (request.purpose !== 'assistant') continue
    while ((messageSeqs[cursor] ?? Number.POSITIVE_INFINITY) < request.startSeq) {
      cursor += 1
      precedingMessages += 1
    }
    index += 1
    const assistant = assistants.get(stepKey(request.turn, request.step))
    const prompt = request.prompt
    const config = request.requestConfig ?? prompt?.config
    const tools: CallToolCard[] = []
    const seen = new Set<string>()
    let digest: AssistantDigest | null = null
    if (assistant !== undefined) {
      digest = digestAssistant(assistant)
      for (const head of digest.calls) {
        if (seen.has(head.callId)) continue
        seen.add(head.callId)
        tools.push(toolCard(head, results.get(head.callId), assistant.time))
      }
    }
    for (const call of snapshot.runningCalls) {
      if (call.turn !== request.turn || call.step !== request.step) continue
      if (seen.has(call.callId)) continue
      seen.add(call.callId)
      tools.push(runningCard(call))
    }
    const completedAt = request.completedAt
    const tokens = readCallTokens(request.usage)
      ?? (assistant === undefined ? null : readCallTokens(assistant.usage))
      ?? UNREPORTED_TOKENS
    const card: CallCard = {
      index,
      turn: request.turn,
      step: request.step,
      startSeq: request.startSeq,
      startedAt: request.startedAt,
      completedAt,
      durationMs: completedAt === null ? null : Math.max(0, completedAt - request.startedAt),
      status: request.status,
      error: request.error ?? null,
      request: {
        provider: config?.provider ?? request.providerMetadata?.provider ?? null,
        model: config?.model ?? request.providerMetadata?.model ?? null,
        hasSystem: (prompt?.system.trim().length ?? 0) > 0,
        messageCount: precedingMessages,
        toolDefinitionCount: prompt?.tools.length ?? 0,
      },
      response: {
        text: digest?.text ?? '',
        reasoningCharacters: digest?.reasoningCharacters ?? 0,
        contentCharacters: digest?.contentCharacters ?? 0,
        toolCallCount: tools.length,
      },
      tokens,
      tools,
    }
    const bucket = callsByTurn.get(request.turn)
    if (bucket === undefined) callsByTurn.set(request.turn, [card])
    else bucket.push(card)
    toolCalls += tools.length
    earliest = earliest === null ? request.startedAt : Math.min(earliest, request.startedAt)
    const end = completedAt ?? request.startedAt
    latest = latest === null ? end : Math.max(latest, end)
  }

  const turns: CallTurn[] = []
  for (const [turn, calls] of [...callsByTurn.entries()].sort((left, right) => left[0] - right[0])) {
    turns.push({ turn, title: titles.get(turn) ?? '', calls })
  }

  return {
    turns,
    totals: {
      turns: turns.length,
      modelCalls: index,
      toolCalls,
      elapsedMs: earliest === null || latest === null ? null : Math.max(0, latest - earliest),
    },
  }
}
