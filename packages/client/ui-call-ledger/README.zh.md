---
description: "dsh Web 客户端的工作流视图:按轮次呈现已记录的模型调用、token 用量、工具调用与耗时,注册进对话视图环。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-call-ledger

[English](README.md) | 中文

## 概述

「工作流」标签页把一次会话已记录的模型调用按轮次呈现为卡片。顶部汇总条统计用户对话轮数、模型调用次数、工具调用次数与总耗时;左侧轮次列表用于选定某一轮;每张卡片展示 REQUEST 的模型与提示规模、RESPONSE 的文本与推理规模、工具调用及其结果与耗时,以及提供方上报的 token 计数。台账只呈现会话日志已记录的内容,不新增任何模型可见输入。它投影轨迹目标的快照,而不自行折叠会话事件,因此两个标签页始终对同一批调用保持一致。shipped Web 组合保持该插件停用,因此在该行被启用前标签页不会显示。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

shipped Web 组合通过 `packages/bundle/web-app/cordis.patch.yml` 中停用的 `ui-call-ledger` 行解析 `@deepseek-ai/dsh-client-ui-call-ledger`;请先启用该行,再启动需要显示该标签页的 Web 会话。启用后,在对话的视图环中打开「工作流」标签页:该标签位于「对话」与「轨迹」之间。

### 阅读台账

汇总条统计已加载窗口:用户对话按轮次分组计数,模型调用按普通助手请求计数,工具调用按这些请求发起的调用计数,总耗时取最早调用的开始到最近一次已知完成。

每个轮次行显示轮次编号、该轮开启的用户消息与调用次数。选中某一轮会把卡片列筛选到该轮,再次选中则恢复全部轮次。

一张卡片对应一次助手请求。卡片头部包含调用编号、记录的起始时间、耗时与运行状态。token 行显示输入、未缓存输入、缓存命中、缓存写入、输出与推理计数,或在提供方未上报用量时说明这一点。REQUEST 面板给出模型名,并统计系统提示、其前的用户与助手消息数以及本次请求的工具定义数。RESPONSE 面板预览助手文本,并统计推理字符数、内容字符数与工具调用数。工具区逐条列出调用的参数、结果预览、状态与耗时。

### 载入更早的调用

未加载的更早前缀留在视图底部的载入控件之后。点击一次即载入上一个更早的会话分页。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

本包注册一个 `calls` 对话视图目标、一个 order 为 5 的 `conversation.view` 槽位条目,以及其 `callLedger` 字典。该视图目标不物化任何自己的节点:其 builder 返回同一个稳定的空台账,因此该目标只为标签选择与目标记账而存在。

呈现值来自轨迹目标。视图条目的 inject face 通过 `uiConversation` 服务寻址它,并用纯函数投影其快照,因此本包从不值导入另一个插件。台账以该 face 的注册者私有 `hooks.calls` 数据源送达组件,由渲染器绑定为 `useCalls`;本视图是它唯一的消费者,因此无需会话级标准 prop。

订阅轨迹目标才是本视图得以工作的原因。对话目标在第一个订阅者出现时加入会话的单调激活集,并在该会话剩余生命期内保持激活,而装配器只推进激活的目标。因此被绑定的 `useCalls` hook 即使在「工作流」标签处于前台时也会让轨迹目标持续物化,台账无需本包折叠会话事件即可保持最新。

投影按轨迹快照的身份记忆,因此已发布数据源在轨迹事实未变时返回同一个台账引用。

本包不提供任何服务,除其 locale 命名空间外不声明任何 Context 合并。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

以下页面覆盖承载本视图的外壳,以及它所投影的目标。

- [ui-conversation](../ui-conversation/README.zh.md) —— 承载 `conversation.view` 环与装配器激活目标规则的对话外壳。
- [ui-trajectory](../ui-trajectory/README.zh.md) —— 本视图所投影的轨迹目标。
- [ui-chat](../ui-chat/README.zh.md) —— 共享同一视图环的对话视图。

-----

<a id="model-experience"></a>
## 模型体验

无。该包是浏览器端的呈现层,不注册任何面向模型的内容。

#### KV Cache 影响

无;该包既不组装也不发送提供方请求。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- **不列出压缩请求** —— 台账只对普通助手生成分组,因此一次压缩的提供方调用只在轨迹台账中出现,在此没有卡片。
- **计数只覆盖已加载窗口** —— 前序消息计数与全部合计均来自已加载的会话窗口,因此未加载的更早前缀会使其偏小,直到载入控件把它取回。
- **进行中的调用没有耗时** —— 没有记录完成的调用报告其运行状态与未知耗时标记,而不是给出一段经过时间。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文——点击展开</summary>

None.

</details>

**Runtime invariant:** No companion is published. 本包是纯消费者:它通过槽位与会话服务注册一个视图目标与一个会话数据源,不发出 Cordis 事件,也不持有可变跨插件状态;其注册都是普通 effect,本包的行为规格直接观察其释放。
