---
description: "Call-ledger view for the dsh web client: a per-turn presentation of recorded model calls, token usage, tool calls, and durations, registered into the conversation view ring."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-call-ledger

English | [中文](README.zh.md)

## Summary

The Workflow tab presents one Session's recorded model calls as per-turn cards. A summary strip counts user turns, model calls, tool calls, and elapsed time; the turn list selects one turn; each card shows the REQUEST model and prompt size, the RESPONSE text and reasoning size, the tool calls with their results and durations, and the provider token counters. The ledger reports what the Session log already recorded and adds no model-visible input. It projects the Trajectory target's snapshot rather than folding Session events itself, so both tabs always agree on the same calls. The shipped Web bundle keeps the plugin disabled, so the tab is hidden until a composition enables the `ui-call-ledger` row.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

The shipped Web graph resolves `@deepseek-ai/dsh-client-ui-call-ledger` through a disabled `ui-call-ledger` row in `packages/bundle/web-app/cordis.patch.yml`; enable that row before starting the Web Session that should show the tab. Once it is enabled, open the Workflow tab in the conversation's view ring. The tab sits between Chat and Trajectory.

### Reading the ledger

The summary strip counts the loaded window: user turns as turn groups, model calls as ordinary assistant requests, tool calls as the calls those requests made, and elapsed time from the earliest call start to the latest known completion.

Each turn row shows its number, its opening user message, and its call count. Selecting a turn filters the card column to that turn and selecting it again restores every turn.

A card reports one assistant request. Its header carries the call number, the recorded start time, the duration, and the run state. The token row shows input, uncached input, cache hits, cache writes, output, and reasoning counters, or states that the provider reported no usage. The REQUEST pane names the model and counts the system prompt, the preceding conversation messages, and the request's tool definitions. The RESPONSE pane previews the assistant text and counts its reasoning characters, content characters, and tool calls. The tool section lists each call with its arguments, its result preview, its state, and its duration.

### Loading older calls

An older unloaded prefix stays behind the load control at the foot of the view. One click loads the next earlier Session page.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The package registers a `calls` Conversation view target, one `conversation.view` slot entry at order 5, and its `callLedger` dictionaries. The view target materializes no Nodes of its own: its builder returns one stable empty ledger, so the target exists for tab selection and target accounting only.

The rendered value comes from the Trajectory target. The view entry's inject face addresses it through the `uiConversation` service and projects its snapshot with a pure function, so this package never value-imports another plugin. The ledger travels to the component as the face's registrant-private `hooks.calls` source, which the renderer binds as `useCalls`; this view is its only consumer, so it needs no Session-wide standard prop.

Subscribing to the Trajectory target is what makes this view work. A Conversation target joins the Session's monotonic active set on its first subscriber and stays active for the remaining Session, and the assembler advances only active targets. The bound `useCalls` hook therefore keeps the Trajectory target materializing even while the Workflow tab is the one on screen, and the ledger stays current without this package folding Session events.

An absent Trajectory snapshot projects to one module-level empty ledger. The projection is memoized on the Trajectory snapshot's identity, so the published source keeps returning the same ledger reference while the Trajectory facts are unchanged.

The package provides no service and declares no Context merge beyond its locale namespace.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

These pages cover the surface hosting this view and the target it projects.

- [ui-conversation](../ui-conversation/README.md) — the chat surface hosting the `conversation.view` ring and the assembler's active-target rules.
- [ui-trajectory](../ui-trajectory/README.md) — the Trajectory target whose snapshot this view projects.
- [ui-chat](../ui-chat/README.md) — the Chat view sharing the same ring.

-----

<a id="model-experience"></a>
## Model Experience

None, as this package is a browser-side presentation layer that registers nothing model-facing.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Compaction requests are not listed** — the ledger groups ordinary assistant generations only, so a compaction provider call appears in the Trajectory ledger without a card here.
- **Counts cover the loaded window** — the preceding-message count and every total derive from the loaded Session window, so an unloaded prefix understates them until the load control fetches it.
- **A running call has no duration** — a call without a recorded completion reports its run state and the unknown-duration marker instead of an elapsed time.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>

**Runtime invariant:** No companion is published. The package is a pure consumer: it registers one view target and one Session source through the slot and Session services, emits no Cordis events, and owns no mutable cross-plugin state; its registrations are plain effects whose disposal the package behavior specs observe directly.
