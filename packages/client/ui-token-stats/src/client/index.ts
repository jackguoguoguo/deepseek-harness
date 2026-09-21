/**
 * Token-statistics surface plugin, browser half: the composer-left widget
 * carrying a context-occupancy progress bar and a live input/output token bar
 * chart. Both figures arrive through the standard `useProjection` seat over the
 * token-meter `contextPressure` and `tokenUsage` Session projections; the
 * plugin owns no transport state and adds no Session event.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the generated Remote API and ctx.remote merge through the Client assembly boundary.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
// Type-only: pulls the Session Controller service used for projected token state.
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
// Type-only: pulls the Conversation input-row slot declaration.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the renderer-owned slots service.
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the Session standard `useProjection` seat.
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import { TokenStatsMeter } from './TokenStatsMeter.tsx'
import { en, zh, type TokenStatsKey } from './locales.ts'

export type { TokenStatsProps } from './TokenStatsMeter.tsx'
export type { TokenStatsKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Composer-left token-statistics copy. */
    tokenStats: TokenStatsKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'tokenStats'

/** Required services: Slot registry, Session scope sources, and copy. */
export const inject = ['sessions', 'slots', 'locale']

/**
 * Client plugin body: the composer-dock token-statistics entry, rendered at the
 * dock's left edge — left of the shipped step pills and the context-occupancy
 * control.
 * @param ctx - Client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-token-stats: dictionaries')
  ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
    name: 'conversation.composer.dock',
    id: 'token-stats',
    // Before the dock's shipped stats pills (order 0) and the ContextMeter, so
    // the chart sits at the dock's left edge, to the left of the step pills.
    order: -10,
    locale: NS,
  }, TokenStatsMeter))
}
