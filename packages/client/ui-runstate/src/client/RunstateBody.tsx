/** The run-state window body: a terminal-style, auto-scrolling operation log. */
import { useEffect, useRef, type ReactNode } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { RunstateCallEntry, RunstateReviewEntry } from './contract.ts'
import type {} from './locales.ts'
import css from './RunstateBody.module.css'

/** Body props: the session-scoped run-state selector plus copy. */
export type RunstateBodyProps =
  & PropsRuntime<'sidebar.right.pane.tab'>
  & PropsLocale<'runstate'>

/** Render the run-state log for one Session. */
export function RunstateBody({ useRunstate, t }: RunstateBodyProps): ReactNode {
  const entries = useRunstate?.(s => s.entries)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Follow the tail as operations stream in, but only when the user is already
  // pinned to the bottom: arriving mid-scroll must not yank the view.
  useEffect(() => {
    const el = scrollRef.current
    if (el === null) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distance < 24) el.scrollTop = el.scrollHeight
  }, [entries])

  if (entries === undefined || entries.length === 0) {
    return <div className={css.empty}>{t('empty')}</div>
  }

  return (
    <div className={css.root} ref={scrollRef}>
      {entries.map(entry => entry.kind === 'call'
        ? <CallLine key={`call:${entry.callId}`} entry={entry} t={t} />
        : <ReviewLine key={`review:${entry.callId}`} entry={entry} t={t} />)}
    </div>
  )
}

/** One command-line or tool execution line. */
function CallLine({ entry, t }: { entry: RunstateCallEntry; t: RunstateBodyProps['t'] }): ReactNode {
  const duration = entry.durationMs === null ? null : t('elapsed', { seconds: Math.round(entry.durationMs / 1000) })
  return (
    <div className={css.call} data-runstate-state={entry.state}>
      <span className={css.glyph} aria-hidden="true">$</span>
      <span className={css.tool}>{entry.toolName}</span>
      {entry.command !== '' && <span className={css.command}>{entry.command}</span>}
      <span className={css.status}>{t(`state.${entry.state}`)}</span>
      {duration !== null && <span className={css.duration}>{duration}</span>}
      {entry.output !== null && <pre className={css.output}>{entry.output}</pre>}
    </div>
  )
}

/** One review decision line. */
function ReviewLine({ entry, t }: { entry: RunstateReviewEntry; t: RunstateBodyProps['t'] }): ReactNode {
  const approved = entry.decision === 'approved'
  return (
    <div className={css.review}>
      <span className={css.glyph} aria-hidden="true">·</span>
      <span className={css.tool}>{entry.toolName}</span>
      <span className={css.reviewLabel}>{t('review')}</span>
      <span className={approved ? css.accepted : css.rejected}>{t(approved ? 'review.approved' : 'review.denied')}</span>
    </div>
  )
}
