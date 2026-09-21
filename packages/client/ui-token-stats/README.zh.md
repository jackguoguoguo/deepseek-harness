---
description: "Web 输入区 Token 统计：基于 token-meter 会话投影、按步上下镜像的输入/输出 token 柱状图，位于 dock 最左侧、步骤统计 pills 左侧。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-token-stats

[English](README.md) | 中文

## 概述

本包提供一个绘制在 composer dock 中的组件，位于 dock 最左侧、会话统计 pills 与上下文占用控件之前；每上报一步就绘制一根上下镜像的柱子对：输入在中轴上方、输出在下方。数值不做常驻显示，鼠标悬停才可见。每对柱来自 [`dsh-token-meter`](../../llm/token-meter/README.zh.md) 的 `tokenUsage` 会话投影，通过标准的 `useProjection` 座位读取，因此插件不持有任何传输状态，也不新增 Session 事件。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [延伸阅读](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与暂缓事项](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

在 Web 组合中挂载本插件，并同时挂载一个 token-meter 提供方（base bundle 已组合一个）；该行不接受任何配置。当前会话存在第二次用量结算后，composer dock 最左侧（统计 pills 之前）就会出现该组件。

### 预期表现

柱状图读取 `tokenUsage`。投影暴露的是累计总量，因此每次持久结算都会追加一根新柱，其数值是该步骤相对上一次的增量：计费输入（`uncachedInputTokens` 及该投影报告的缓存桶）在中轴上方，`outputTokens` 在中轴下方，二者都按会话至今的最大单桶缩放。界面不直接绘制任何数字；鼠标悬停一根柱子会显示这步的输入/输出值，`aria-label` 也为辅助技术提供同样信息。当柱子排布超过固定宽度后，整列会平滑向左滑动，最旧的柱子被裁剪出视野。只上报过不足两笔用量的会话不渲染任何内容，dock 因此不会长出一个空组件。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

插件在 `conversation.composer.dock` 上注册一个 list 条目，`order: -10`，并作为单个 effect 注册 `tokenStats` 字典。组件（[`src/client/TokenStatsMeter.tsx`](src/client/TokenStatsMeter.tsx)）通过 Session 标准的 `useProjection` 座位读取 `tokenUsage` 投影，把每步增量存入以 `MAX_PAIRS` 为上限的组件状态，再渲染镜像柱状图。node 半部分是一个空 `apply`，用于让插件留在 host roster 上。

</details>

-----

<a id="further-exploration"></a>
## 延伸阅读

- [dsh-token-meter](../../llm/token-meter/README.zh.md)——本组件读取的 `tokenUsage` 投影。
- [dsh-client-ui-conversation](../ui-conversation/README.zh.md)——声明 `conversation.composer.dock` 的 composer，以及它在 dock 中的上下文占用控件。
- [dsh-client-ui-chat](../ui-chat/README.zh.md)——每轮 token 面板与会话统计 pill。

-----

<a id="model-experience"></a>
## 模型体验

无，因为本组件是浏览器界面元素；这里没有任何内容会进入模型请求。

#### KV Cache 影响

无；本包既不组装也不发送提供方请求。

## 已知限制与暂缓事项

<a id="known-limitations-and-deferred-work"></a>

- **柱状图绘制的是已结算用量的增量。** 实时流式增量不会被绘制，因为持久的 `tokenUsage` 投影在用量结算时前进，而不是在瞬时帧上；每根新柱都是相对上一次总量的增量。
- **每个会话的柱列有上限。** `MAX_PAIRS` 限制保留的柱子数（120），因此超长会话最终会从组件状态中丢弃最旧的柱子，而不只是移出视野。
- **切换模型会重置整列比例。** 峰值基于整个保留柱列计算，一次新的大请求会重新等比缩放所有已保留的柱子。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文——点击展开</summary>

dock 此前不展示任何按步 token 信息：上下文占用只存在于它自己的控件中，累计 token 总量只存在于 Chat 的每轮面板中。本包在 dock 最左侧（统计 pills 之前）新增按步柱状图，既不搬迁也不复制任一归属方的状态。

</details>

**运行时不变式：** 不发布伴生入口。插件注册一个字典 effect 与一个 composer-dock 条目，其释放由 HMR 安全性测试证明；每一根柱都派生自单一的 `tokenUsage` 投影，不存在第二份副本可供分叉。