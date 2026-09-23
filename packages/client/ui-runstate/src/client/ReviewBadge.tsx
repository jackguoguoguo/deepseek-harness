/** Per-operation approval badge: green 同意 / red 拒绝, beside each tool call. */
import type { ReactNode } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from './locales.ts'
import css from './ReviewBadge.module.css'

/** Props: the session-scoped run-state selector, the call id, and copy. */
export type RunstateReviewBadgeProps =
  & PropsRuntime<'tool.call.review'>
  & PropsLocale<'runstate'>
  & { callId: string }

/** Render the review decision for one tool call, or nothing if none was recorded. */
export function RunstateReviewBadge({ callId, useRunstate, t }: RunstateReviewBadgeProps): ReactNode {
  const decision = useRunstate?.(s => s.reviews.get(callId))
  if (decision === undefined) return null
  const approved = decision === 'approved'
  return (
    <span className={approved ? css.approved : css.denied} data-runstate-review={decision}>
      {t(approved ? 'review.approved' : 'review.denied')}
    </span>
  )
}
