/**
 * The run-state contract: one ordered log of what the Session executed, plus
 * the review decision reached for each operation.
 *
 * The log is a Conversation target of its own, so it folds the same durable
 * events every other target reads and replays identically after a reload. It
 * never reads another target's snapshot: a run-state entry is derived from the
 * events that produced the operation, not from a Chat or Trajectory row.
 */
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'

/** The Conversation target this package's Definitions build. */
export const RUNSTATE_TARGET = 'runstate' as const

/** A Session with no folded operations yet. */
export const EMPTY_RUNSTATE_SNAPSHOT: RunstateSnapshot = {
  entries: [],
  reviews: new Map(),
}

/** Definition kind of the Tool-call lifecycle. */
export const RUNSTATE_CALL_KIND = 'runstate-tool-call'

/** Definition kind of the approval lifecycle. */
export const RUNSTATE_REVIEW_KIND = 'runstate-approval'

/** One human review decision, as the run state presents it. */
export type RunstateDecision = 'approved' | 'denied'

/** Lifecycle of one Tool call, in the vocabulary a run log prints. */
export type RunstateCallState = 'running' | 'ok' | 'error' | 'interrupted'

/** One executed operation: the command line that ran, and what came back. */
export interface RunstateCallEntry {
  readonly kind: 'call'
  /** Seq of the `tool/call` that started it; the log's ordering key. */
  readonly seq: number
  /** Unix epoch ms of that `tool/call`. */
  readonly time: number
  readonly callId: string
  readonly toolName: string
  /** One-line target of the call: a shell command when the arguments carry one. */
  readonly command: string
  readonly state: RunstateCallState
  /** Flattened result text; null while running and when the result carries none. */
  readonly output: string | null
  /** Wall-clock run time; null until the call settles. */
  readonly durationMs: number | null
}

/** One review decision on one operation. */
export interface RunstateReviewEntry {
  readonly kind: 'review'
  /** Seq of the `approval/asked` that owns it; the log's ordering key. */
  readonly seq: number
  /** Unix epoch ms of that `approval/asked`. */
  readonly time: number
  readonly callId: string
  readonly toolName: string
  readonly decision: RunstateDecision
}

/** One line of the run-state log. */
export type RunstateEntry = RunstateCallEntry | RunstateReviewEntry

/** The whole run state of one Session. */
export interface RunstateSnapshot {
  /** Every operation and review decision, in log order. */
  readonly entries: readonly RunstateEntry[]
  /**
   * Review decision per Tool call id. A call absent from this map was never
   * put to a human decision, so it draws no label.
   */
  readonly reviews: ReadonlyMap<string, RunstateDecision>
}

declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
  interface ConversationViewSnapshotMap {
    /** Run-state log assembled from `tool/*` and `approval/*` events. */
    runstate: RunstateSnapshot
  }
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SessionStandardProps {
    /** Selector hook over the current Session's run state. */
    useRunstate: SnapshotSelectorHook<RunstateSnapshot>
  }
}
