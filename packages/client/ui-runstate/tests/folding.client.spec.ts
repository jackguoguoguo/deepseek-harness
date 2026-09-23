/**
 * Run-state folding in isolation: the per-operation line builders and the
 * view builder that orders folded nodes into a log and derives the per-call
 * review map. These are the pieces a Conversation replay proves without any
 * other target's snapshot, so they test without the slot runtime.
 */
import { describe, expect, it } from 'vitest'
import type { ContentBlock } from '@deepseek-ai/dsh-llm/types'
import {
  commandLine, decisionOf, outputText, settleState,
} from '../src/client/definitions.ts'
import {
  RUNSTATE_CALL_KIND, RUNSTATE_REVIEW_KIND,
} from '../src/client/contract.ts'
import {
  RunstateSnapshotBuilder, type RunstateViewNode,
} from '../src/client/builder.ts'

describe('commandLine', () => {
  it('prefers the shell command among argument keys', () => {
    expect(commandLine(JSON.stringify({ command: 'ls -la /tmp', description: 'list' }))).toBe('ls -la /tmp')
  })

  it('falls back to the next specific key when no command', () => {
    expect(commandLine(JSON.stringify({ description: 'do thing' }))).toBe('do thing')
    expect(commandLine(JSON.stringify({ query: 'find x' }))).toBe('find x')
  })

  it('prints raw argument text when the JSON carries no known key', () => {
    expect(commandLine(JSON.stringify({ nested: { a: 1 } }))).toBe('{"nested":{"a":1}}')
  })

  it('returns the raw text for non-JSON arguments and an empty string for none', () => {
    expect(commandLine('plain args here')).toBe('plain args here')
    expect(commandLine('')).toBe('')
  })

  it('keeps only the first line and trims to a bounded log line', () => {
    expect(commandLine(JSON.stringify({ command: 'line one\nline two' }))).toBe('line one')
    const long = 'x'.repeat(500)
    const trimmed = commandLine(JSON.stringify({ command: long }))
    expect(trimmed).toBe(`${'x'.repeat(240)}…`)
  })

  it('tolerates mid-stream truncated argument JSON', () => {
    expect(commandLine('{"command":"ls -la')).toBe('{"command":"ls -la')
  })
})

describe('outputText', () => {
  it('flattens text blocks into one body', () => {
    expect(outputText([{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }] as ContentBlock[])).toBe('a\nb')
  })

  it('returns null when the result carries no text', () => {
    expect(outputText([])).toBeNull()
    expect(outputText([{ type: 'image' } as ContentBlock])).toBeNull()
  })
})

describe('settleState', () => {
  it('classifies a settled call from the error code and isError flag', () => {
    expect(settleState('interrupted', false)).toBe('interrupted')
    expect(settleState(undefined, true)).toBe('error')
    expect(settleState('some-code', false)).toBe('error')
    expect(settleState(undefined, false)).toBe('ok')
  })
})

describe('decisionOf', () => {
  it('maps only a real human decision to a label', () => {
    expect(decisionOf('allowed-once')).toBe('approved')
    expect(decisionOf('rejected')).toBe('denied')
    expect(decisionOf('cancelled')).toBeNull()
    expect(decisionOf(null)).toBeNull()
  })
})

describe('RunstateSnapshotBuilder', () => {
  const callNode: RunstateViewNode = {
    key: 'call:1', kind: RUNSTATE_CALL_KIND, id: '1', target: 'runstate',
    data: { kind: 'call', seq: 2, time: 0, callId: 'c1', toolName: 'bash', command: 'ls', state: 'ok', output: 'out', durationMs: 10 },
  }
  const reviewNode: RunstateViewNode = {
    key: 'review:1', kind: RUNSTATE_REVIEW_KIND, id: '2', target: 'runstate',
    data: { kind: 'review', seq: 1, time: 0, callId: 'c1', toolName: 'bash', decision: 'approved' },
  }

  it('orders folded nodes by event seq and derives the per-call review map', () => {
    const snap = new RunstateSnapshotBuilder().replace({ nodes: [callNode, reviewNode] })
    expect(snap.entries.map(entry => entry.seq)).toEqual([1, 2])
    expect(snap.reviews.get('c1')).toBe('approved')
    expect(snap.reviews.has('missing')).toBe(false)
  })

  it('returns an empty log for no nodes', () => {
    const snap = new RunstateSnapshotBuilder().replace({ nodes: [] })
    expect(snap.entries).toEqual([])
    expect(snap.reviews.size).toBe(0)
  })

  it('merges upserted tail nodes with the window', () => {
    const builder = new RunstateSnapshotBuilder()
    builder.replace({ nodes: [reviewNode] })
    const snap = builder.apply({ upserts: [callNode] })
    expect(snap.entries.map(entry => entry.seq)).toEqual([1, 2])
    expect(snap.reviews.get('c1')).toBe('approved')
  })
})
