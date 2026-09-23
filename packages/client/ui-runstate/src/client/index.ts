/**
 * Browser half of the run-state plugin.
 *
 * Wires four contributions, all within this package's own surface:
 *  - two Conversation Definitions fold `tool/*` and `approval/*` events into a
 *    `runstate` target (the log itself);
 *  - a session source exposes that target as the `useRunstate` hook;
 *  - a right-sidebar tab type (stage one + its body) renders the window;
 *  - a header toggle and a per-operation review badge attach to existing slots.
 *
 * Nothing here edits another package; the two external touch points
 * (`conversation.session.header.utilities`, `tool.call.review`) are slots those
 * packages already declare.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
// Type-only: the `tool.call.review` SlotMap row (declared by the Tool layer)
// must be in the program for `PropsRuntime<'tool.call.review'>` to type.
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import type { SessionBinding } from '@deepseek-ai/dsh-api-session-controller/client'
import type { RunstateSnapshot } from './contract.ts'
import { EMPTY_RUNSTATE_SNAPSHOT } from './contract.ts'
import { NS, RUNSTATE_ID, RUNSTATE_KIND, en, zh } from './locales.ts'
import { runstateViewDefinition } from './builder.ts'
import { runstateCallDefinition, runstateReviewDefinition } from './definitions.ts'
import { runstateTabDefinition } from './definition.tsx'
import { RunstateBody } from './RunstateBody.tsx'
import { RunstateToggle, type RunstateToggleInjected } from './RunstateToggle.tsx'
import { RunstateReviewBadge } from './ReviewBadge.tsx'

/** Client services this plugin contributes into. */
export const inject = [
  'slots', 'locale', 'uiSession', 'uiConversation', 'sidebarRight', 'sidebarRightTabs',
] as const

/**
 * Register the run-state surface.
 * @param ctx - client root context carrying the slot registry, copy, and the
 *   conversation / session / sidebar-right services.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-runstate: dictionaries')
  const t = ctx.locale.bind(NS)

  ctx.effect(() => ctx.uiConversation.events.register(runstateCallDefinition), 'ui-runstate: call definition')
  ctx.effect(() => ctx.uiConversation.events.register(runstateReviewDefinition), 'ui-runstate: review definition')
  ctx.effect(() => ctx.uiConversation.views.register(runstateViewDefinition), 'ui-runstate: view target')

  // Expose the folded log to any session-scoped slot through `useRunstate`.
  ctx.effect(() => ctx.uiSession.provide({
    hooks: ['runstate'],
    resolve: (binding: SessionBinding) => {
      const source = ctx.uiConversation.binding(binding).target('runstate')
      const hook: ObservableSnapshot<RunstateSnapshot> = {
        subscribe: source.subscribe,
        getSnapshot: () => source.getSnapshot() ?? EMPTY_RUNSTATE_SNAPSHOT,
      }
      return { hooks: { runstate: hook } }
    },
  }), 'ui-runstate: session source')

  // Stage one: the tab type, with its guide entry for discovery.
  ctx.effect(() => ctx.sidebarRightTabs.register(runstateTabDefinition(t)), 'ui-runstate: tab type')

  // Stage two: the window body, keyed by the tab type id.
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab',
    key: RUNSTATE_ID,
    locale: NS,
  }, RunstateBody)), 'ui-runstate: tab body')

  // Header toggle: open/close the run-state window. The slot declares no inject
  // contract for the control surface, so `toggle` reaches the component through
  // `inject`; the rest of its props come from the slot and the locale.
  ctx.effect(() => ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
    name: 'conversation.session.header.utilities',
    id: RUNSTATE_ID,
    order: 50,
    locale: NS,
    inject: (): RunstateToggleInjected => ({ toggle: () => toggleRunstate(ctx) }),
  }, RunstateToggle)), 'ui-runstate: header toggle')

  // Per-operation review badge, rendered inside each tool-call row.
  ctx.effect(() => ctx.slots.inject('tool.call.review', () => ctx.slots.register({
    name: 'tool.call.review',
    locale: NS,
  }, RunstateReviewBadge)), 'ui-runstate: review badge')
}

/**
 * Open the run-state window if it is closed, close it if open. Acted on the
 * mounted seat's active Session, since the header control has no tab id of its
 * own and `ISidebarRight` exposes no cross-Session inventory.
 * @param ctx - client root context.
 */
function toggleRunstate(ctx: ClientContext): void {
  const active = ctx.sidebarRight.active()
  if (active !== undefined && active.kind === RUNSTATE_KIND) {
    ctx.sidebarRight.close(active.id)
  } else {
    ctx.sidebarRight.openTab(RUNSTATE_KIND)
  }
}
