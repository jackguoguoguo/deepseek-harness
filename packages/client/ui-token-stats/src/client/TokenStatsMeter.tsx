/**
 * Composer-left token usage chart: one mirrored input/output pair per durable
 * usage settlement, grown one step at a time. No value text is drawn; hovering
 * a pair reveals its numbers. When the growing chart outruns the fixed widget
 * width, the older pairs slide out to the left and fade.
 *
 * The `tokenUsage` projection exposes cumulative totals, so each new pair is
 * the delta against the previous settlement — one bar per step, in step order.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: the `tokenUsage` projection key merge.
import type { TokenUsageProjection } from '@deepseek-ai/dsh-token-meter/client'
// Type-only: pulls the Conversation input-row slot declaration.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls the Session standard `useProjection` seat.
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import css from './TokenStatsMeter.module.css'

/** Full props of the composer-dock token-statistics entry. */
export type TokenStatsProps =
  PropsRuntime<'conversation.composer.dock'>
  & PropsLocale<'tokenStats'>

/** One step's input/output pair. */
interface UsagePair {
  readonly id: number
  readonly input: number
  readonly output: number
}

/** Column pitch in px; must agree with the module CSS. */
const STEP = 16

/** Fixed widget width in px; must agree with the module CSS `.root`. */
const WIDTH = 168

/** Pairs kept per Session, so an endless run cannot grow the DOM without bound. */
const MAX_PAIRS = 120

/** Tallest bar half in px; must agree with the module CSS `.up`/`.down`. */
const MAX_BAR = 9

/* jscpd:ignore-start -- Intentionally mirrors the Conversation context meter's
   compact-number formatter; feature plugins share no runtime values. */
/**
 * Format a token count for the compact chart.
 * @param value - token count.
 * @param t - Token-statistics locale seat.
 * @returns Count using a K or M suffix when needed.
 */
function formatTokens(value: number, t: TokenStatsProps['t']): string {
  const scaled = (candidate: number): string => candidate >= 100
    ? String(Math.round(candidate))
    : String(Math.round(candidate * 10) / 10)
  if (value < 1_000) return String(value)
  if (value < 1_000_000) return t('number.thousand', { value: scaled(value / 1_000) })
  return t('number.million', { value: scaled(value / 1_000_000) })
}
/* jscpd:ignore-end */

/**
 * Render one settlement pair: input rising above the axis, output below it.
 * @param pair - this step's usage delta.
 * @param peak - the largest single bucket, shared by every pair's scale.
 * @param t - Token-statistics locale seat for the hover values.
 * @returns the pair column.
 */
function UsageBars({ pair, peak, t }: {
  pair: UsagePair
  peak: number
  t: TokenStatsProps['t']
}): React.JSX.Element {
  const height = (value: number): number => (
    value === 0 ? 0 : Math.max(1, Math.round(value / peak * MAX_BAR))
  )
  return (
    <Tooltip
      label={t('chart.tooltip', {
        input: formatTokens(pair.input, t),
        output: formatTokens(pair.output, t),
      })}
      side="top"
      delayMs={300}
    >
      <span
        className={css.column}
        role="img"
        data-step=""
        aria-label={t('chart.pair', {
          count: pair.id + 1,
          input: formatTokens(pair.input, t),
          output: formatTokens(pair.output, t),
        })}
      >
        <span className={css.up} data-side="input" style={{ height: `${height(pair.input)}px` }} />
        <span className={css.down} data-side="output" style={{ height: `${height(pair.output)}px` }} />
      </span>
    </Tooltip>
  )
}

/**
 * Render the growing mirrored input/output chart.
 * @param props - Session runtime seats and localized copy.
 * @returns The widget, or nothing until a second settlement exists.
 */
export function TokenStatsMeter(props: TokenStatsProps): React.JSX.Element | null {
  const { useProjection, t } = props
  const usage = useProjection('tokenUsage')
  const previous = useRef<TokenUsageProjection | undefined>(undefined)
  const nextId = useRef(0)
  const [pairs, setPairs] = useState<UsagePair[]>([])

  useEffect(() => {
    if (usage === undefined) return
    const last = previous.current
    previous.current = usage
    if (last === undefined) return
    // Billed input spans the three disjoint input buckets; output is its own.
    const input = Math.max(0, usage.uncachedInputTokens - last.uncachedInputTokens)
      + Math.max(0, usage.cacheReadTokens - last.cacheReadTokens)
      + Math.max(0, usage.cacheWriteTokens - last.cacheWriteTokens)
    const output = Math.max(0, usage.outputTokens - last.outputTokens)
    if (input === 0 && output === 0) return
    setPairs(current => [
      ...current.slice(-(MAX_PAIRS - 1)),
      { id: nextId.current++, input, output },
    ])
  }, [usage])

  const peak = useMemo(
    () => Math.max(1, ...pairs.flatMap(pair => [pair.input, pair.output])),
    [pairs],
  )
  // Newest pair sits at the widget's right edge; overflow slides the whole run
  // left, pushing the oldest pairs out of view.
  const offset = Math.max(0, pairs.length * STEP - WIDTH)

  if (pairs.length === 0) return null

  return (
    <div className={css.root} role="group" aria-label={t('chart.aria', { count: pairs.length })} data-token-stats="">
      <span className={css.axis} aria-hidden />
      <div
        className={css.slide}
        data-slide=""
        style={{ left: `${-offset}px`, width: `${pairs.length * STEP}px` }}
      >
        {pairs.map(pair => (
          <UsageBars key={pair.id} pair={pair} peak={peak} t={t} />
        ))}
      </div>
    </div>
  )
}
