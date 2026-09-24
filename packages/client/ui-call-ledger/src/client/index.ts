/**
 * Browser call-ledger plugin contributing the `calls` Conversation view: a
 * per-turn presentation of recorded model calls, projected from the Trajectory
 * target's snapshot.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { SessionBinding } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the 'conversation.view' SlotMap row must be in the program.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: declares the Trajectory row this view projects from.
import type { TrajectorySnapshot } from '@deepseek-ai/dsh-client-ui-trajectory/client'
import { CallsView, type CallsViewInjected } from './CallsView.tsx'
import type { CallsSnapshot } from './calls-contract.ts'
import { EMPTY_CALLS_SNAPSHOT, projectCalls } from './calls-projection.ts'
import { registerCallsConversationView } from './calls-view-definition.ts'
import { en, NS, zh } from './locales.ts'

export type { CallsSnapshot } from './calls-contract.ts'
export type { CallLedgerKey } from './locales.ts'

/** Required services: Conversation assembly, Session scopes, slots, and copy. */
export const inject = ['slots', 'sessions', 'uiConversation', 'locale']

/**
 * Client plugin body: register the call-ledger view tab and publish the Session
 * source it renders from. Subscribing to the Trajectory target is what adds it
 * to the Session's monotonic active set, so the projected ledger keeps
 * advancing for the rest of the Session even while another tab is shown.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  const sources = new WeakMap<SessionBinding, ObservableSnapshot<CallsSnapshot>>()
  const callsSource = (binding: SessionBinding): ObservableSnapshot<CallsSnapshot> => {
    let source = sources.get(binding)
    if (source === undefined) {
      const trajectory = ctx.uiConversation.binding(binding).target('trajectory')
      // Memoize on the Trajectory snapshot's identity so this source returns the
      // same ledger reference until the Trajectory facts actually move.
      const projected: { observed: TrajectorySnapshot | undefined; snapshot: CallsSnapshot } = {
        observed: undefined,
        snapshot: EMPTY_CALLS_SNAPSHOT,
      }
      source = {
        getSnapshot: () => {
          const current = trajectory.getSnapshot()
          if (current !== projected.observed) {
            projected.observed = current
            projected.snapshot = projectCalls(current)
          }
          return projected.snapshot
        },
        subscribe: listener => trajectory.subscribe(listener),
      }
      sources.set(binding, source)
    }
    return source
  }
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-call-ledger: dictionaries')
  // Registration-time text (the view tab label) reads through the bound
  // translate as a thunk, so it follows the active locale without re-registration.
  const t = ctx.locale.bind(NS)
  registerCallsConversationView(ctx)
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'calls',
    order: 5,
    locale: NS,
    label: () => t('view.calls'),
    inject: (sessionId: SessionId): CallsViewInjected => {
      const binding = ctx.sessions.binding(sessionId)
      if (binding === undefined) {
        throw new Error(`ui-call-ledger: session "${sessionId}" is unavailable`)
      }
      const source = callsSource(binding)
      return {
        hooks: { calls: source },
        loadOlder: async () => {
          const before = source.getSnapshot()
          await binding.session.loadOlder()
          return source.getSnapshot() !== before
        },
      }
    },
  }, CallsView))
}
