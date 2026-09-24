// @vitest-environment jsdom
/**
 * ui-call-ledger plugin halves: the browser entry's view-target, inject-face,
 * dictionary, and view-tab registrations against the real slot tree (with fiber
 * teardown proving removal — HMR safety), plus the inert node half.
 */

import { Context } from '@deepseek-ai/cordis'
import { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ConversationViewDefinition } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { resolveSlotLabel } from '@deepseek-ai/dsh-client-ui-slots'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { stubConfigForm } from '@deepseek-ai/dsh-client-test-runtime'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import { apply as applyLocale, inject as localeInject } from '@deepseek-ai/dsh-client-locale/client'
import { describe, expect, it } from 'vitest'
import { apply, inject } from '../src/client/index.ts'
import type { CallLedgerSource } from '../src/client/calls-projection.ts'
import { type CallsViewInjected } from '../src/client/CallsView.tsx'
import { en, NS, zh } from '../src/client/locales.ts'
import { apply as applyNode } from '../src/index.ts'

/** One engine snapshot carrying a single completed call. */
const TRAJECTORY: CallLedgerSource = {
  eventNodes: [],
  eventLocations: new Map(),
  requests: [{
    purpose: 'assistant',
    startSeq: 5,
    startedAt: 1_000,
    completedAt: 3_000,
    status: 'complete',
    turn: 1,
    step: 1,
  }],
  runningCalls: [],
}

interface Bench {
  readonly ctx: Context
  readonly fiber: ReturnType<Context['plugin']>
  readonly views: ConversationViewDefinition[]
  /** Target ids the plugin asked the Conversation binding for. */
  readonly requestedTargets: string[]
  /** Subscription calls the plugin forwarded to the Trajectory source. */
  readonly counters: { subscriptions: number }
  /** The stable Session binding the Controller stub returns. */
  readonly sessionBinding: { session: { loadOlder(): Promise<void> } }
}

/** Boot the browser half over a real slot tree that declares the view ring. */
async function bench(options: { knownSession?: boolean; unstableTrajectory?: boolean } = {}): Promise<Bench> {
  const views: ConversationViewDefinition[] = []
  const requestedTargets: string[] = []
  const counters = { subscriptions: 0 }
  const trajectory = {
    getSnapshot: () => (options.unstableTrajectory === true ? { ...TRAJECTORY } : TRAJECTORY),
    subscribe: () => {
      counters.subscriptions += 1
      return () => {}
    },
  }
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  ctx.slots.register({
    name: 'root',
    children: { 'conversation.view': { kind: 'list', scope: 'session' } },
  } as never, () => null)
  ctx.provide('uiConversation', {
    binding: () => ({
      target: (name: string) => {
        requestedTargets.push(name)
        return trajectory
      },
    }),
    views: {
      register: (definition: ConversationViewDefinition) => {
        views.push(definition)
        return () => {}
      },
    },
  } as never)
  const sessionBinding = { session: { loadOlder: async () => undefined } }
  ctx.provide('sessions', {
    binding: () => (options.knownSession === false ? undefined : sessionBinding),
  } as never)
  // The locale plugin binds a settings scope, which reads the connection handle,
  // the forwarded-event port, and the developer-tools preference.
  ctx.provide('connection', { api: { settings: {} }, isLoopback: false } as never)
  ctx.provide('remote', { $on: () => () => {} } as never)
  ctx.provide('configForms', {
    developerTools: { enabled: createSnapshotStore(true) },
    get: () => stubConfigForm().scope,
  } as never)
  await ctx.plugin({ inject: localeInject, apply: applyLocale }).await()
  ctx.locale.setLocale('zh')
  const fiber = ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  return { ctx, fiber, views, requestedTargets, counters, sessionBinding }
}

function viewEntry(ctx: Context) {
  return ctx.slots.entries('conversation.view').find(entry => entry.options.id === 'calls')
}

/** Resolve the registered view's injected face for one Session. */
function faceOf(ctx: Context, sessionId = 's1'): CallsViewInjected {
  const face = viewEntry(ctx)?.inject as ((id: SessionId) => CallsViewInjected) | undefined
  if (face === undefined) throw new Error('the view entry registered no inject face')
  return face(SessionId(sessionId))
}

describe('ui-call-ledger browser half', () => {
  it('declares the services it binds', () => {
    expect(inject).toEqual(['slots', 'sessions', 'uiConversation', 'locale'])
  })

  it('registers the view target and the view tab between Chat and Trajectory', async () => {
    const { ctx, views } = await bench()
    expect(views.map(definition => definition.target)).toEqual(['calls'])
    const entry = viewEntry(ctx)
    expect(entry?.options.order).toBe(5)
    expect(resolveSlotLabel(entry?.options.label)).toBe('工作流')
  })

  it('binds the ledger hook projected from the Trajectory target', async () => {
    const { ctx, requestedTargets } = await bench()
    const ledger = faceOf(ctx).hooks.calls.getSnapshot()
    expect(requestedTargets).toEqual(['trajectory'])
    expect(ledger.totals).toEqual({ turns: 1, modelCalls: 1, toolCalls: 0, elapsedMs: 2_000 })
  })

  it('returns one stable ledger reference until the Trajectory facts move', async () => {
    const { ctx } = await bench()
    const source = faceOf(ctx).hooks.calls
    const first = source.getSnapshot()
    expect(source.getSnapshot()).toBe(first)
  })

  it('reprojects when the Trajectory snapshot identity changes', async () => {
    const { ctx } = await bench({ unstableTrajectory: true })
    const source = faceOf(ctx).hooks.calls
    const first = source.getSnapshot()
    expect(source.getSnapshot()).not.toBe(first)
    expect(source.getSnapshot().totals.modelCalls).toBe(1)
  })

  it('forwards its subscriptions so the Trajectory target stays materialized', async () => {
    const { ctx, counters } = await bench()
    const release = faceOf(ctx).hooks.calls.subscribe(() => {})
    expect(counters.subscriptions).toBe(1)
    release()
  })

  it('reuses one source for a Session binding it has already resolved', async () => {
    const { ctx } = await bench()
    expect(faceOf(ctx).hooks.calls).toBe(faceOf(ctx).hooks.calls)
  })

  it('exposes the history loader through the inject face', async () => {
    const { ctx } = await bench()
    await expect(faceOf(ctx).loadOlder()).resolves.toBe(false)
  })

  it('refuses a Session the Controller does not know', async () => {
    const { ctx } = await bench({ knownSession: false })
    expect(() => faceOf(ctx, 'gone')).toThrow('ui-call-ledger: session "gone" is unavailable')
  })

  it('removes every registration with the fiber (HMR safety)', async () => {
    const { ctx, fiber } = await bench()
    expect(viewEntry(ctx)).toBeDefined()
    await fiber.dispose()
    expect(viewEntry(ctx)).toBeUndefined()
  })

  it('registers both dictionaries under its own namespace and releases them with the fiber', async () => {
    const { ctx, fiber } = await bench()
    const translate = ctx.locale.bind(NS)
    expect(translate('view.calls')).toBe(zh['view.calls'])
    ctx.locale.setLocale('en')
    expect(translate('view.calls')).toBe(en['view.calls'])

    await fiber.dispose()
    expect(translate('view.calls')).not.toBe(en['view.calls'])
  })

  it('keeps the English dictionary key-identical to the Chinese source of truth', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort())
  })
})

describe('ui-call-ledger node half', () => {
  it('contributes no host behavior', () => {
    expect(applyNode).not.toThrow()
  })
})
