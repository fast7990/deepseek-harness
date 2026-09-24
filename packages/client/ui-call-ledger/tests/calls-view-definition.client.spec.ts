/** Call-ledger view target registration. */

import { Context } from '@deepseek-ai/cordis'
import type {
  ConversationTimelineSnapshot, ConversationViewDefinition,
} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { describe, expect, it } from 'vitest'
import { registerCallsConversationView } from '../src/client/calls-view-definition.ts'
import { EMPTY_CALLS_SNAPSHOT } from '../src/client/calls-projection.ts'

const NO_TIMELINE: ConversationTimelineSnapshot = { turnOrder: [], turns: new Map() }

describe('callsViewDefinition', () => {
  it('materializes one stable empty ledger for both replace and apply', () => {
    const builder = registered().create()
    expect(builder.empty).toBe(EMPTY_CALLS_SNAPSHOT)
    expect(builder.replace({ nodes: [], timeline: NO_TIMELINE })).toBe(EMPTY_CALLS_SNAPSHOT)
    expect(builder.apply({ upserts: [], timeline: NO_TIMELINE })).toBe(EMPTY_CALLS_SNAPSHOT)
  })

  it('registers one target named for the view tab', () => {
    expect(registered().target).toBe('calls')
  })
})

/** Register through a stubbed Conversation service and return what it received. */
function registered(): ConversationViewDefinition {
  let captured: ConversationViewDefinition | undefined
  const ctx = new Context()
  ctx.provide('uiConversation', {
    views: {
      register: (definition: ConversationViewDefinition) => {
        captured = definition
        return () => {}
      },
    },
  } as never)
  registerCallsConversationView(ctx)
  if (captured === undefined) throw new Error('the view target was not registered')
  return captured
}
