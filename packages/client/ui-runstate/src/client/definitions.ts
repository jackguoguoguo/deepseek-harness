/**
 * The run state's two business Definitions: what one executed operation is,
 * and what a human decided about it.
 *
 * Both are target-owned: they read the same durable events every other
 * Definition reads and keep their own state machines, so neither has to know
 * how Chat or Trajectory project the same log. An operation whose `tool/call`
 * is outside the loaded window is not reconstructed: the log shows what the
 * window proves, and an approval that names no call can hang no label.
 */
import type { ConversationNodeDefinition } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ContentBlock } from '@deepseek-ai/dsh-llm/types'
import type { ApprovalOutcome } from '@deepseek-ai/dsh-user-approval/types'
// Pulls the `approval/*` rows of `SessionEventMap` into this program, so the
// match below narrows on those event types instead of casting their payloads.
import type {} from '@deepseek-ai/dsh-user-approval/types'
import {
  RUNSTATE_CALL_KIND, RUNSTATE_REVIEW_KIND, RUNSTATE_TARGET,
  type RunstateCallEntry, type RunstateCallState, type RunstateDecision, type RunstateReviewEntry,
} from './contract.ts'

/** Longest command line kept; a longer one is cut rather than wrapping the log. */
const MAX_COMMAND = 240

/** Argument keys that name what a call actually ran, most specific first. */
const COMMAND_KEYS = ['command', 'description', 'path', 'file_path', 'query', 'pattern', 'url'] as const

/** Folded Tool-call lifecycle. */
interface CallState {
  readonly seq: number
  readonly time: number
  readonly callId: string
  readonly toolName: string
  readonly command: string
  readonly state: RunstateCallState
  readonly output: string | null
  /** Unix epoch ms of the settling `tool/result`; null while running. */
  readonly endedAt: number | null
}

/** Folded approval lifecycle. */
interface ReviewState {
  readonly seq: number
  readonly time: number
  /** Absent when the ask did not name the call it was about. */
  readonly callId: string | undefined
  readonly toolName: string
  readonly outcome: ApprovalOutcome | null
}

/** First line of a multi-line value; the log prints one line per operation. */
function firstLine(text: string): string {
  const newline = text.indexOf('\n')
  return newline === -1 ? text : text.slice(0, newline)
}

/** Trim one possibly multi-line value to a single bounded log line. */
function oneLine(text: string): string {
  const line = firstLine(text)
  return line.length > MAX_COMMAND ? `${line.slice(0, MAX_COMMAND)}…` : line
}

/** Parse a call's argument JSON; mid-stream truncation leaves `undefined`. */
function parseArgs(argsRaw: string): unknown {
  try {
    return JSON.parse(argsRaw)
  } catch {
    return undefined
  }
}

/**
 * The one line the log prints as an operation's target: the shell command when
 * the arguments carry one, otherwise the argument text itself.
 * @param argsRaw - the call's raw argument JSON or incomplete raw text.
 * @returns the line, empty when the call carried no arguments.
 */
export function commandLine(argsRaw: string): string {
  if (argsRaw === '') return ''
  const parsed = parseArgs(argsRaw)
  if (typeof parsed === 'object' && parsed !== null) {
    const fields = parsed as Record<string, unknown>
    for (const key of COMMAND_KEYS) {
      const value = fields[key]
      if (typeof value === 'string' && value !== '') return oneLine(value)
    }
  }
  return oneLine(argsRaw)
}

/**
 * Flatten a settled result's text blocks into one printable body.
 * @param content - the result's content blocks.
 * @returns the flattened text, or null when it carries none.
 */
export function outputText(content: readonly ContentBlock[]): string | null {
  const parts: string[] = []
  for (const block of content) {
    if (block.type === 'text') parts.push(block.text)
  }
  const joined = parts.join('\n').replace(/\s+$/, '')
  return joined === '' ? null : joined
}

/**
 * Classify a settled call for the log.
 * @param code - structured error code when the result carries one.
 * @param isError - the result block's own error flag.
 * @returns the run-state lifecycle value.
 */
export function settleState(code: string | undefined, isError: boolean): RunstateCallState {
  if (code === 'interrupted') return 'interrupted'
  return code !== undefined || isError ? 'error' : 'ok'
}

/**
 * Present an approval outcome as the run state's decision.
 * @param outcome - durable approval outcome.
 * @returns the decision to print, or null for an outcome that is no human
 * decision (a cancelled ask, or one no answerer was reachable for).
 */
export function decisionOf(outcome: ApprovalOutcome | null): RunstateDecision | null {
  switch (outcome) {
    case 'allowed-once': return 'approved'
    case 'rejected': return 'denied'
    default: return null
  }
}

/** One Tool call, from its `tool/call` through its `tool/result`. */
export const runstateCallDefinition: ConversationNodeDefinition<CallState> = {
  kind: RUNSTATE_CALL_KIND,
  target: RUNSTATE_TARGET,
  match: (event) => {
    if (event.type === 'tool/call') return { id: String(event.data.callId), role: 'start' }
    if (event.type === 'tool/result') return { id: String(event.data.message.source.callId), role: 'update' }
    return null
  },
  start: (_context, match) => {
    const event = match.event
    if (event.type !== 'tool/call') throw new Error('runstate tool call start requires tool/call')
    return {
      seq: event.seq,
      time: event.time,
      callId: String(event.data.callId),
      toolName: event.data.name,
      command: commandLine(event.data.arguments),
      state: 'running',
      output: null,
      endedAt: null,
    }
  },
  update: (context, match) => {
    const event = match.event
    if (event.type !== 'tool/result') return context.state
    const block: { readonly content?: readonly ContentBlock[]; readonly isError?: boolean } | undefined =
      event.data.message.content[0]
    return {
      ...context.state,
      state: settleState(event.data.error?.code, block?.isError === true),
      output: block?.content === undefined ? null : outputText(block.content),
      endedAt: event.time,
    }
  },
  buildViewNode: (context) => {
    const state = context.state
    if (state === undefined) return null
    const data: RunstateCallEntry = {
      kind: 'call',
      seq: state.seq,
      time: state.time,
      callId: state.callId,
      toolName: state.toolName,
      command: state.command,
      state: state.state,
      output: state.output,
      durationMs: state.endedAt === null ? null : state.endedAt - state.time,
    }
    return { key: context.key, kind: RUNSTATE_CALL_KIND, id: context.id, target: RUNSTATE_TARGET, data }
  },
}

/** One approval ask, from `approval/asked` through `approval/decided`. */
export const runstateReviewDefinition: ConversationNodeDefinition<ReviewState> = {
  kind: RUNSTATE_REVIEW_KIND,
  target: RUNSTATE_TARGET,
  match: (event) => {
    if (event.type === 'approval/asked') return { id: String(event.data.id), role: 'start' }
    if (event.type === 'approval/decided') return { id: String(event.data.id), role: 'update' }
    return null
  },
  start: (_context, match) => {
    const event = match.event
    if (event.type !== 'approval/asked') throw new Error('runstate review start requires approval/asked')
    return {
      seq: event.seq,
      time: event.time,
      callId: event.data.callId === undefined ? undefined : String(event.data.callId),
      toolName: event.data.toolName,
      outcome: null,
    }
  },
  update: (context, match) => {
    const event = match.event
    if (event.type !== 'approval/decided') return context.state
    return { ...context.state, outcome: event.data.outcome }
  },
  buildViewNode: (context) => {
    const state = context.state
    if (state === undefined || state.callId === undefined) return null
    const decision = decisionOf(state.outcome)
    // An ask nobody has answered yet is not a decision the log can print.
    if (decision === null) return null
    const data: RunstateReviewEntry = {
      kind: 'review',
      seq: state.seq,
      time: state.time,
      callId: state.callId,
      toolName: state.toolName,
      decision,
    }
    return { key: context.key, kind: RUNSTATE_REVIEW_KIND, id: context.id, target: RUNSTATE_TARGET, data }
  },
}
