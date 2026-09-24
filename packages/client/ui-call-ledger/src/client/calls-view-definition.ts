/** Conversation view target for the call ledger. */

import type { Context } from '@deepseek-ai/cordis'
import type {
  ConversationViewBuilder, ConversationViewDefinition, ConversationViewNode,
} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { CallsSnapshot } from './calls-contract.ts'
import { EMPTY_CALLS_SNAPSHOT } from './calls-projection.ts'

/**
 * Builder for the `calls` target. The ledger is projected from the Trajectory
 * target's snapshot, so this target materializes no Nodes of its own and every
 * materialization yields the same stable empty ledger.
 */
class CallsViewBuilder implements ConversationViewBuilder<ConversationViewNode, CallsSnapshot> {
  readonly empty = EMPTY_CALLS_SNAPSHOT

  /** @returns the stable empty ledger. */
  replace(): CallsSnapshot {
    return EMPTY_CALLS_SNAPSHOT
  }

  /** @returns the stable empty ledger. */
  apply(): CallsSnapshot {
    return EMPTY_CALLS_SNAPSHOT
  }
}

/** Call-ledger target factory. */
export const callsViewDefinition: ConversationViewDefinition<ConversationViewNode, CallsSnapshot> = {
  target: 'calls',
  create: () => new CallsViewBuilder(),
}

/**
 * Register the call-ledger view target.
 * @param ctx - plugin context receiving the view definition.
 */
export function registerCallsConversationView(ctx: Context): void {
  ctx.uiConversation.views.register(callsViewDefinition)
}
