---
description: "Tool-call run state for the dsh web client: a right-Sidebar terminal-style window streaming command and Tool execution, and the green/red review label beside each Tool call."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-runstate

English | [中文](README.zh.md)

## Summary

The run-state window shows what the Session actually executed: a terminal-style, auto-scrolling log of every Tool call and command line, with its running/settled state, flattened output, and wall-clock duration. A header toggle opens and closes the window; beside each Tool-call row the package draws a green **同意** or red **拒绝** label for the human decision recorded on that call. The log folds the same durable `tool/*` and `approval/*` events every other view reads, so it replays identically after a reload and never reads another target's snapshot.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Open the **运行态** (Run State) entry in the conversation header utilities, or pick the run-state capsule on the right-Sidebar guide page, to open the window. The window streams every operation as it happens: a `$` line names the Tool and the command it ran, shows its state (`运行中` / `已完成` / `失败` / `已中断`), and — once settled — its elapsed time and output. A review line records a human decision as `审核 同意` / `审核 拒绝`. With no operations yet, the window shows `暂无运行记录`.

### The operation log

Each Tool call is one log line. The command shown is the shell command when the call's arguments carry one, otherwise the argument text; longer arguments are trimmed to one bounded line. A still-running call shows no duration or output. A settled call shows its elapsed wall-clock time and the flattened text result, if any. Review decisions appear as their own lines, keyed to the same call id.

### The per-call review label

A feature (this package) folds the Session's `approval/*` events into a per-call decision and registers into the `tool.call.review` slot, which `ui-tool` declares as a child of every Tool-call row. With no decision recorded for a call — an auto-approved or policy-resolved call — the row draws no label. Only a real human decision (`allowed-once` → 同意, `rejected` → 拒绝) produces a label; a cancelled or unavailable ask produces none.

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The run state is a Conversation target of its own. Two target-owned Definitions (`runstate-tool-call`, `runstate-approval`) keep their own event state machines over the shared Session window and build one log Node each; a Session-owned incremental builder (`RunstateSnapshotBuilder`) folds those Nodes into a single ordered `RunstateSnapshot`. A session source exposes that target through the `useRunstate` hook, so any session-scoped slot can render it without importing the folding logic.

**Definitions (business).** `runstate-tool-call` matches `tool/call` (start) and `tool/result` (update) by call id, classifying the settle as `ok`, `error`, or `interrupted` from the result's error code and `isError` flag. `runstate-approval` matches `approval/asked` (start) and `approval/decided` (update); an ask that names no call, or one whose outcome is not a human decision, builds no Node and draws no label.

**Builder (view).** `RunstateSnapshotBuilder` orders Nodes by their event `seq` and derives `reviews: Map<callId, decision>` for the per-call label. It never reads another target's snapshot; a run-state entry is derived only from the events that produced the operation.

**Window (right Sidebar).** The tab type is a two-stage registration: the type (`runstateTabDefinition`, with its guide capsule) and the body (`RunstateBody`) registered into `sidebar.right.pane.tab` keyed by the tab id. The body renders the log and follows the tail only while the user is pinned to the bottom, so streaming never yanks a mid-scroll view.

**Header toggle.** `conversation.session.header.utilities` declares no inject contract, so the toggle closes over the `toggle` and `sidebarRight` control surface from `apply` through a wrapper component. The public `ISidebarRight` face exposes no cross-Session open-tab inventory, so the toggle does not currently track a pressed state (see Known Limitations).

**Per-call label.** `tool.call.review` is a single session-scope slot `ui-tool` declares as a child of the Tool-call row; this package registers `RunstateReviewBadge`, which reads `useRunstate(s => s.reviews.get(callId))` and renders nothing when no decision is recorded.

</details>

-----

<a id="model-experience"></a>
## Model Experience

The run-state window is a user-facing inspector; it contributes no model-facing surface. The host half is empty.

-----

<a id="known-limitations-and-deferred-work"></a>
## Known Limitations and Deferred Work

- The window shows one row per Tool call; nested PTC sub-calls are not yet de-nested into an indented tree.
- Output is flattened to text; structured JSON results are not yet pretty-printed.
- The log is session-scoped and replays only the loaded window, matching every other target.
- The header toggle opens and closes the window but does not reflect a pressed/active state, because the public `ISidebarRight` face exposes no cross-Session open-tab inventory to read from.

-----

<a id="dev-note"></a>
## Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

Add a run-state column by registering another entry into `sidebar.right.pane.tab` with a distinct key, or a per-call label by occupying `tool.call.review`. The folding logic lives in `definitions.ts`; the log reading lives in `RunstateBody.tsx`. The `runstate` target and the `useRunstate` hook are declared in `contract.ts` via module augmentation, so adding a consumer needs no change to `ui-session`.

</details>
