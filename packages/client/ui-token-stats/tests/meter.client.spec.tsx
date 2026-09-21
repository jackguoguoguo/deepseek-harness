// @vitest-environment jsdom
/** Composer chart presentation: per-step mirrored pairs, hover values, slide-out. */

import { fireEvent, act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TokenUsageProjection } from '@deepseek-ai/dsh-token-meter/client'
import { TokenStatsMeter, type TokenStatsProps } from '../src/client/TokenStatsMeter.tsx'

afterEach(() => {
  cleanup()
})

const messages: Record<string, (v: Record<string, unknown>) => string> = {
  'chart.aria': v => `Per-step input/output token chart, ${String(v.count)} steps`,
  'chart.tooltip': v => `Input ${String(v.input)} · Output ${String(v.output)}`,
  'chart.pair': v => `Step ${String(v.count)}: ${String(v.input)} input, ${String(v.output)} output`,
  'number.thousand': v => `${String(v.value)}K`,
  'number.million': v => `${String(v.value)}M`,
}

/** A mutable projection read through the runtime seat, so a rerender moves the chart. */
function makeProps(): { props: TokenStatsProps; set(usage: TokenUsageProjection | undefined): void } {
  let usage: TokenUsageProjection | undefined
  return {
    props: {
      useProjection: ((key: string) => {
        if (key !== 'tokenUsage') return undefined
        return usage
      }) as never,
      t: ((key: string, values?: Record<string, unknown>) => (
        messages[key]?.(values ?? {}) ?? key
      )) as never,
    } as TokenStatsProps,
    set: (next) => { usage = next },
  }
}

/** Test usage with zero cache traffic, which the charts treat as billed input. */
function usage(uncachedInputTokens: number, outputTokens: number): TokenUsageProjection {
  return { uncachedInputTokens, outputTokens, cacheReadTokens: 0, cacheWriteTokens: 0 }
}

describe('TokenStatsMeter', () => {
  it('renders nothing before the first worth-reporting settlement', () => {
    const { props, set } = makeProps()
    const { container, rerender } = render(<TokenStatsMeter {...props} />)
    expect(container.querySelector('[data-token-stats]')).toBeNull()
    // First settlement only establishes the baseline; no bar yet.
    set(usage(100, 50))
    rerender(<TokenStatsMeter {...props} />)
    expect(container.querySelector('[data-token-stats]')).toBeNull()
  })

  it('appends one mirrored pair per subsequent settlement', () => {
    const { props, set } = makeProps()
    set(usage(100, 50))
    const { container, rerender } = render(<TokenStatsMeter {...props} />)
    set(usage(400, 90))
    rerender(<TokenStatsMeter {...props} />)

    expect(container.querySelectorAll('[data-step]')).toHaveLength(1)

    set(usage(1_000, 180))
    rerender(<TokenStatsMeter {...props} />)
    expect(container.querySelectorAll('[data-step]')).toHaveLength(2)
  })

  it('renders input above and output below the axis', () => {
    const { props, set } = makeProps()
    set(usage(100, 50))
    const { container, rerender } = render(<TokenStatsMeter {...props} />)
    set(usage(400, 250))
    rerender(<TokenStatsMeter {...props} />)

    const column = container.querySelector('[data-step]')
    const up = column?.querySelector('[data-side="input"]')
    const down = column?.querySelector('[data-side="output"]')
    const upHeight = Number((up as HTMLElement | null)?.style.height.replace('px', '') ?? 0)
    const downHeight = Number((down as HTMLElement | null)?.style.height.replace('px', '') ?? 0)
    // Deltas are 300 input vs 200 output; 300 is the peak, so input fills the column.
    expect(upHeight).toBe(9)
    expect(downHeight).toBe(6)
  })

  it('keeps only the reporting side visible when the other delta is zero', () => {
    const { props, set } = makeProps()
    set(usage(100, 50))
    const { container, rerender } = render(<TokenStatsMeter {...props} />)
    set(usage(500, 50))
    rerender(<TokenStatsMeter {...props} />)

    const column = container.querySelector('[data-step]')
    const up = column?.querySelector('[data-side="input"]') as HTMLElement
    const down = column?.querySelector('[data-side="output"]') as HTMLElement
    expect(up).not.toBeNull()
    // Delta 400 vs 0: input fills to the peak; output has no height.
    expect(up.style.height).toBe('9px')
    expect(down?.style.height).toBe('0px')
  })

  it('exposes hover values through the pair aria label instead of text', () => {
    const { props, set } = makeProps()
    set(usage(100, 50))
    const { rerender } = render(<TokenStatsMeter {...props} />)
    set(usage(1_000, 2_500_000))
    rerender(<TokenStatsMeter {...props} />)

    const column = screen.getByRole('img')
    expect(column.getAttribute('aria-label'))
      .toBe('Step 1: 900 input, 2.5M output')
    expect(screen.queryByText('900')).toBeNull()
    expect(screen.queryByText('2.5M')).toBeNull()
  })

  it('reveals the pair values on hover through the tooltip bubble', () => {
    vi.useFakeTimers()
    try {
      const { props, set } = makeProps()
      set(usage(100, 50))
      const { container, rerender } = render(<TokenStatsMeter {...props} />)
      set(usage(400, 250))
      rerender(<TokenStatsMeter {...props} />)

      const column = container.querySelector('[data-step]') as HTMLElement
      expect(container.querySelector('[role="tooltip"]')).toBeNull()
      fireEvent.mouseEnter(column)
      act(() => { vi.advanceTimersByTime(400) })
      const bubble = container.querySelector('[role="tooltip"]')
      expect(bubble?.textContent).toBe('Input 300 · Output 200')
      // The bubble leaves the clipped chart: leave hides it again.
      fireEvent.mouseLeave(column)
      expect(container.querySelector('[role="tooltip"]')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps the run flush-left while it fits, then slides left past the width', () => {
    const { props, set } = makeProps()
    set(usage(1, 1))
    const { container, rerender } = render(<TokenStatsMeter {...props} />)
    const slide = () => container.querySelector('[data-slide]') as HTMLElement
    // 2 pairs at 16px = 32px, well inside the 168px widget: no offset.
    set(usage(4, 3))
    rerender(<TokenStatsMeter {...props} />)
    expect(slide().style.left).toBe('0px')
    // 14 pairs at 16px = 224px; the 168px widget slides 56px.
    for (let i = 2; i <= 14; i++) {
      set(usage(2 + i * 2, 2 + i))
      rerender(<TokenStatsMeter {...props} />)
    }
    expect(slide().style.left).toBe('-56px')
  })

  it('slides the run left once the pairs outgrow the widget', () => {
    const { props, set } = makeProps()
    set(usage(1, 1))
    const { container, rerender } = render(<TokenStatsMeter {...props} />)
    for (let i = 0; i < 14; i++) {
      set(usage(1 + i * 2, 2 + i))
      rerender(<TokenStatsMeter {...props} />)
    }
    // 14 pairs at 16px = 224px; the 168px widget slides 56px.
    const slide = container.querySelector('[data-slide]') as HTMLElement
    expect(slide.style.left).toBe('-56px')
  })
})
