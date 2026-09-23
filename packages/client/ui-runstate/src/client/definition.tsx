/** The run-state tab type: a right-sidebar surface like the terminal. */
import type { SidebarRightTabDefinition } from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-locale/client'
import type {} from './locales.ts'
import { IconPlayOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { RUNSTATE_ID, RUNSTATE_KIND } from './locales.ts'

/**
 * Declare the run-state tab type (stage one of the two-stage registration).
 * @param t - run-state namespace translator.
 * @returns the tab definition for `ctx.sidebarRightTabs.register`.
 */
export function runstateTabDefinition(t: TranslateNS<'runstate'>): SidebarRightTabDefinition {
  return {
    id: RUNSTATE_ID,
    kind: RUNSTATE_KIND,
    priority: 'builtin',
    title: () => t('title'),
    guide: [{
      id: RUNSTATE_ID,
      order: 50,
      title: () => t('title'),
      description: () => t('guide.description'),
      icon: IconPlayOutline16,
    }],
  }
}
