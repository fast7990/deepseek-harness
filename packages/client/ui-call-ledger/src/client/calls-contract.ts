/** Data contracts for the call-ledger Conversation view. */

/** Provider token accounting reported for one model call. */
export interface CallTokens {
  /** Total input tokens, or null when the provider reported no usage. */
  readonly input: number | null
  /** Input tokens served from a provider cache. */
  readonly cached: number | null
  /** Input tokens that were not served from a provider cache. */
  readonly uncached: number | null
  /** Input tokens written into a provider cache. */
  readonly cacheWrite: number | null
  /** Completion tokens. */
  readonly output: number | null
  /** Reasoning tokens included in the completion. */
  readonly reasoning: number | null
}

/** REQUEST facts recorded for one model call. */
export interface CallRequestFacts {
  readonly provider: string | null
  readonly model: string | null
  /** Whether a non-empty system prompt was in force. */
  readonly hasSystem: boolean
  /** User and assistant messages recorded before this call within the loaded window. */
  readonly messageCount: number
  readonly toolDefinitionCount: number
}

/** RESPONSE facts recorded for one model call. */
export interface CallResponseFacts {
  /** Assistant text with reasoning excluded. */
  readonly text: string
  readonly reasoningCharacters: number
  readonly contentCharacters: number
  readonly toolCallCount: number
}

/** One tool call, paired with its result when that result is loaded. */
export interface CallToolCard {
  readonly callId: string
  readonly name: string
  readonly argsPreview: string
  readonly resultPreview: string
  readonly status: 'running' | 'complete' | 'error'
  readonly durationMs: number | null
}

/** One model call presented as a card. */
export interface CallCard {
  /** 1-based position across the whole loaded ledger. */
  readonly index: number
  readonly turn: number
  /** Agent-loop step that issued the request; 0 for a direct compaction. */
  readonly step: number
  readonly startSeq: number
  readonly startedAt: number
  readonly completedAt: number | null
  readonly durationMs: number | null
  readonly status: 'running' | 'complete' | 'error'
  readonly error: string | null
  readonly request: CallRequestFacts
  readonly response: CallResponseFacts
  readonly tokens: CallTokens
  readonly tools: readonly CallToolCard[]
}

/** One turn's calls in log order. */
export interface CallTurn {
  readonly turn: number
  /** Opening user message, truncated for the turn list. */
  readonly title: string
  readonly calls: readonly CallCard[]
}

/** Session-wide aggregates shown above the ledger. */
export interface CallTotals {
  readonly turns: number
  readonly modelCalls: number
  readonly toolCalls: number
  /** Wall span from the earliest call start to the latest known completion. */
  readonly elapsedMs: number | null
}

/** Complete value published by the call-ledger view source. */
export interface CallsSnapshot {
  readonly turns: readonly CallTurn[]
  readonly totals: CallTotals
}
