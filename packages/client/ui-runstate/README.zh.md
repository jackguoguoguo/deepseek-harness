---
description: "dsh Web 客户端的工具调用运行态：右侧边栏终端式窗口，流式展示命令行与工具调用，并在每次工具调用旁显示绿色「同意」/红色「拒绝」审核标签。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-runstate

[English](README.md) | 中文

## 概述

运行态窗口展示会话实际执行过什么：一个终端式、自动滚动的日志，列出每次工具调用与命令行，及其运行中/已结算状态、输出和耗时。会话头部的开关可打开或关闭该窗口；在每行工具调用旁，本包为记录到该调用的人工决定绘制绿色 **同意** 或红色 **拒绝** 标签。日志折叠的是与其他视图相同的持久化 `tool/*` 与 `approval/*` 事件，因此重载后完全可复现，且从不读取其他目标的快照。

## 目录

- [使用本包](#使用本包)
- [实现原理](#实现原理)
- [模型体验](#模型体验)
- [已知限制与待办](#已知限制与待办)
- [开发备忘](#开发备忘)

-----

<a id="使用本包"></a>
## 使用本包

点击会话头部工具栏的 **运行态** 入口，或在右侧边栏引导页选择运行态卡片，即可打开窗口。窗口随操作发生实时流式更新：`$` 行标明工具及其运行的命令，显示状态（`运行中` / `已完成` / `失败` / `已中断`），并在结算后展示耗时与输出。审核行以 `审核 同意` / `审核 拒绝` 记录人工决定。尚无操作时，窗口显示 `暂无运行记录`。

### 操作日志

每次工具调用为一行日志。命令取自变量中携带的 shell 命令行，否则取参数字符串；过长参数截断为单行。仍在运行的调用不显示耗时与输出；已结算的调用显示墙上耗时与（若有）扁平化文本结果。审核决定作为独立行出现，关联到同一 call id。

### 每次调用的审核标签

本包将会话的 `approval/*` 事件折叠为每个调用的人工决定，并注册到 `tool.call.review` 槽——该槽由 `ui-tool` 声明为每行工具调用的子槽。若某调用未记录决定（自动批准或按策略批准），则不绘制标签。仅真实人工决定（`allowed-once` → 同意，`rejected` → 拒绝）产生标签；取消或不可达的询问不产生标签。

<a id="实现原理"></a>
## 实现原理

<details>
<summary>实现细节 — 点击展开</summary>

运行态本身是独立的会话（Conversation）目标。两个目标私有定义（`runstate-tool-call`、`runstate-approval`）在共享会话窗口上各自维护事件状态机，并为每个操作构建一个日志节点；会话私有的增量构建器（`RunstateSnapshotBuilder`）将这些节点折叠为单一有序的 `RunstateSnapshot`。会话源通过 `useRunstate` 钩子暴露该目标，因此任意会话作用域的槽都能渲染它，而无需引入折叠逻辑。

**定义（业务）。** `runstate-tool-call` 按 call id 匹配 `tool/call`（开始）与 `tool/result`（更新），依据结果的错误码与 `isError` 标记将结算分类为 `ok`、`error` 或 `interrupted`。`runstate-approval` 匹配 `approval/asked`（开始）与 `approval/decided`（更新）；未指明调用的询问，或结果不是人工决定的询问，不构建节点、不绘制标签。

**构建器（视图）。** `RunstateSnapshotBuilder` 按事件 `seq` 排序节点，并派生 `reviews: Map<callId, decision>` 供每行标签使用。它从不读取其他目标的快照；运行态条目仅由产生该操作的事件推导。

**窗口（右侧边栏）。** 标签类型为两段式注册：类型（`runstateTabDefinition`，含引导卡片）与主体（`RunstateBody`）分别注册到以标签 id 为 key 的 `sidebar.right.pane.tab`。主体渲染日志，且仅在用户停留在底部时跟随尾部，因此流式更新不会拽动正在向上浏览的视图。

**头部开关。** `conversation.session.header.utilities` 未声明注入契约，因此开关通过包装组件从 `apply` 闭包捕获 `toggle` 与 `sidebarRight` 控制面。公开 `ISidebarRight` 接口不提供跨会话的已开标签页清单，因此开关目前不跟踪按下态(见"已知限制与延期工作")。

**每行标签。** `tool.call.review` 是 `ui-tool` 声明为工具调用行子槽的单实例会话域槽；本包注册 `RunstateReviewBadge`，读取 `useRunstate(s => s.reviews.get(callId))`，未记录决定时不渲染任何内容。

</details>

-----

<a id="模型体验"></a>
## 模型体验

运行态窗口是面向用户的检查器，不提供任何面向模型的界面。其宿主（host）半部分为空。

-----

<a id="已知限制与待办"></a>
## 已知限制与待办

- 窗口每行展示一次工具调用；嵌套 PTC 子调用尚未展开为缩进树。
- 输出被扁平化为文本；结构化 JSON 结果尚未美化打印。
- 日志为会话作用域，仅复现已加载窗口，与其他目标一致。
- 头部开关负责打开与关闭窗口，但不反映按下/激活态，因为公开 `ISidebarRight` 接口不提供可读取的跨会话已开标签页清单。

-----

<a id="开发备忘"></a>
## 开发备忘

<details>
<summary>维护者工作上下文 — 点击展开</summary>

新增运行态列：向 `sidebar.right.pane.tab` 以不同 key 注册另一个条目；或新增每行标签：占用 `tool.call.review`。折叠逻辑位于 `definitions.ts`，日志渲染位于 `RunstateBody.tsx`。`runstate` 目标与 `useRunstate` 钩子通过 `contract.ts` 的模块增强声明，因此新增消费者无需改动 `ui-session`。

</details>
