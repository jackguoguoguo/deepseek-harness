/**
 * Assembles the run-state log from folded Conversation nodes.
 *
 * The builder is the boundary between the event-folding Definitions and the view:
 * it just holds the latest node set and orders it into a log. Everything that
 * decides what an operation *is* lives in the Definitions; everything about how
 * the log *reads* lives in the body component. Replaying a shifted window calls
 * `replace`; a small tail of new events calls `apply`.
 */
import type {
  ConversationViewBuilder,
  ConversationViewDefinition,
  ConversationViewNode,
} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { RunstateEntry, RunstateSnapshot } from './contract.ts'
import { EMPTY_RUNSTATE_SNAPSHOT } from './contract.ts'

/** One materialized run-state log line, carrying its own ordering key. */
export interface RunstateViewNode extends ConversationViewNode {
  readonly target: 'runstate'
  readonly data: RunstateEntry
}

/** Folds `tool/*` and `approval/*` nodes into the run-state log. */
export class RunstateSnapshotBuilder
implements ConversationViewBuilder<RunstateViewNode, RunstateSnapshot> {
  private readonly nodes = new Map<string, RunstateViewNode>()

  readonly empty = EMPTY_RUNSTATE_SNAPSHOT

  replace(input: { readonly nodes: readonly RunstateViewNode[] }): RunstateSnapshot {
    this.nodes.clear()
    for (const node of input.nodes) this.nodes.set(node.key, node)
    return this.snapshot()
  }

  apply(input: { readonly upserts: readonly RunstateViewNode[] }): RunstateSnapshot {
    for (const node of input.upserts) this.nodes.set(node.key, node)
    return this.snapshot()
  }

  private snapshot(): RunstateSnapshot {
    const entries = [...this.nodes.values()]
      .sort((left, right) => left.data.seq - right.data.seq)
      .map(node => node.data)
    const reviews = new Map<string, 'approved' | 'denied'>()
    for (const entry of entries) {
      if (entry.kind === 'review') reviews.set(entry.callId, entry.decision)
    }
    return { entries, reviews }
  }
}

/** Stage two of the run-state view: the Conversation target `runstate`. */
export const runstateViewDefinition: ConversationViewDefinition<RunstateViewNode, RunstateSnapshot> = {
  target: 'runstate',
  create: () => new RunstateSnapshotBuilder(),
}
