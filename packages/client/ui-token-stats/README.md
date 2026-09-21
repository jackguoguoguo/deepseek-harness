---
description: "Web composer-left token statistics: a per-step mirrored input/output token bar chart over the token-meter Session projections."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-token-stats

English | [中文](README.zh.md)

## Summary

This package provides a composer-left widget that draws one mirrored pair of bars per reported step: input rising above the axis and output below it. Values are revealed on hover, never printed beside the bars. Each pair comes from the [`dsh-token-meter`](../../llm/token-meter/README.md) `tokenUsage` Session projection through the standard `useProjection` seat, so the plugin owns no transport state and adds no Session event.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Mount this plugin in the Web composition beside a token-meter provider (the base bundle composes one); the row takes no config. The widget renders at the composer dock's left edge — left of the session stats pills and the context-occupancy control — once a second usage settlement exists for the current Session.

### What to expect

The chart reads `tokenUsage`. The projection exposes cumulative totals, so each durable settlement appends a new pair whose bars are that step's delta: billed input (`uncachedInputTokens`, plus the cache buckets this projection reports) above the axis and `outputTokens` below it, both scaled against the largest single bucket the Session has seen. No numeric text is drawn; hovering a pair reveals its two values, and the widget's `aria-label` offers them to assistive technology. Once the pair run outgrows the fixed width, the whole run slides left smoothly and the oldest pairs are clipped out of view. A Session with fewer than two settled usage reports renders nothing, so the dock never grows an empty widget.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The plugin registers one list entry on `conversation.composer.dock` with `order: -10`, and registers the `tokenStats` dictionaries as one effect. The component ([`src/client/TokenStatsMeter.tsx`](src/client/TokenStatsMeter.tsx)) reads the `tokenUsage` projection through the Session standard `useProjection` seat, keeps each step's delta in component state bounded by `MAX_PAIRS`, and renders the mirrored bars. The node half is an empty `apply` that keeps the plugin on the host roster.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [dsh-token-meter](../../llm/token-meter/README.md) — the `tokenUsage` projection this widget reads.
- [dsh-client-ui-conversation](../ui-conversation/README.md) — the composer that declares `conversation.composer.dock`, and its own context-occupancy control in the dock.
- [dsh-client-ui-chat](../ui-chat/README.md) — the per-turn token panel and session statistics pills.

-----

<a id="model-experience"></a>
## Model Experience

None, as the widget is browser chrome; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Bars chart deltas of settled usage.** Live streamed deltas are not charted, because the durable `tokenUsage` projection advances on usage settlements rather than on transient frames; each appended pair is the step's delta against the previous total.
- **The run is capped per Session.** `MAX_PAIRS` bounds retained pairs (120), so an extremely long Session eventually drops the oldest column from component state rather than only from view.
- **Model switches can re-scale the run.** Peaks are computed over the whole retained run, so a new large request re-proportions every retained bar.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

The dock previously exposed no per-step token information: context occupancy lived only in its own control and cumulative token totals only in the Chat turn panel. This package adds the per-step chart at the dock's left edge, left of the step pills, without moving or duplicating either owner's state.

</details>

**Runtime invariant:** No companion is published. The plugin registers one dictionary effect and one composer-dock entry whose disposal the HMR-safety spec proves; every bar derives from the single `tokenUsage` projection with no second copy to diverge.