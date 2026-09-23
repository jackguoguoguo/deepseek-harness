/** Run-state copy, locale-owned so no product string lives in the components. */
import type { LocaleNamespaceMap } from '@deepseek-ai/dsh-client-ui-slots'

/** This package's copy namespace. */
export const NS = 'runstate' as const

/** Tab kind and slot key for the run-state window. */
export const RUNSTATE_KIND = 'runstate' as const
/** Key shared by the tab type id and the body slot entry. */
export const RUNSTATE_ID = 'runstate' as const

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    runstate: (
      | 'title'
      | 'guide.description'
      | 'toggle'
      | 'empty'
      | 'state.running'
      | 'state.ok'
      | 'state.error'
      | 'state.interrupted'
      | 'review'
      | 'review.approved'
      | 'review.denied'
      | 'elapsed'
    )
  }
}

/** Simplified Chinese copy. */
export const zh: Record<LocaleNamespaceMap['runstate'] & string, string> = {
  'title': '工具调用运行态',
  'guide.description': '实时展示命令行执行、工具调用等操作的运行状态和输出',
  'toggle': '运行态',
  'empty': '暂无运行记录',
  'state.running': '运行中',
  'state.ok': '已完成',
  'state.error': '失败',
  'state.interrupted': '已中断',
  'review.approved': '同意',
  'review.denied': '拒绝',
  'review': '审核',
  'elapsed': '用时 {seconds} 秒',
}

/** English copy. */
export const en: Record<LocaleNamespaceMap['runstate'] & string, string> = {
  'title': 'Tool Run State',
  'guide.description': 'Live run status and output of command-line and tool operations',
  'toggle': 'Run State',
  'empty': 'No runs yet',
  'state.running': 'Running',
  'state.ok': 'Done',
  'state.error': 'Failed',
  'state.interrupted': 'Interrupted',
  'review.approved': 'Approved',
  'review.denied': 'Denied',
  'review': 'Review',
  'elapsed': 'took {seconds}s',
}
