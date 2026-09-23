/** Header control that toggles the run-state window open or closed. */
import type { ReactNode } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from './locales.ts'
import css from './RunstateToggle.module.css'

/** Control surface the toggle reaches for, captured from `apply` through a wrapper. */
export interface RunstateToggleInjected {
  /** Open the window if closed, close it if open. */
  toggle: () => void
}

/** Props: standard session props, copy, and the injected control surface. */
export type RunstateToggleProps =
  & PropsRuntime<'conversation.session.header.utilities'>
  & PropsLocale<'runstate'>
  & RunstateToggleInjected

/** A header button that toggles the run-state window. */
export function RunstateToggle({ t, toggle }: RunstateToggleProps): ReactNode {
  return (
    <button
      type="button"
      className={css.toggle}
      title={t('toggle')}
      onClick={toggle}
    >
      <span className={css.label}>{t('toggle')}</span>
    </button>
  )
}
