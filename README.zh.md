# DeepSeek Harness

[English](README.md) | 中文

DeepSeek Harness（`dsh`）是由 [DeepSeek AI](https://deepseek.com) 开发的开源 agent harness（智能体框架）。

它构建于**一切皆插件**的架构之上，由 [Cordis](https://github.com/cordiverse/cordis) 驱动，其设计参见论文 [_A Programming Paradigm for Spatiotemporal Composability_](https://arxiv.org/abs/2608.25512)。

文档：[https://deepseek-harness.github.io/deepseek-harness/](https://deepseek-harness.github.io/deepseek-harness/)

## 项目概览

DeepSeek Harness 把模型变成可工作的 agent：它组装系统提示词与工具 schema，流式处理每次模型请求，执行模型调用的工具，并把模型能看到的一切记入可长期保存的会话日志，供恢复、fork、transcript（文本记录）与 Web UI 读回。

产品是一棵插件树，而不是一个固定程序：profile 在启动时按序组装组合包，它们装入的任意配置项都可以被替换或 patch。主要能力族包括：

- **模型** —— 注册在 `ctx.llm` 上的模型适配器。
- **工具** —— shell、文件系统、搜索、网页抓取、终端、后台任务、subagent、skill（技能）与 todo 跟踪，各自注册在 `ctx.tools` 上。
- **执行** —— 同一套文件系统、子进程与沙箱提供方让 Bash、PTY 和 LSP 留在本机，或进入远程沙箱。
- **会话** —— 仅追加的事件日志支撑恢复、fork、transcript 与会话搜索。
- **入口** —— `dsh` CLI、Web GUI、TypeScript 与 Python SDK，以及仅用于自动化的 ACP 服务器。

## 架构

不存在需要打补丁的特权内核：模型适配器、工具注册表、会话日志和 agent loop（智能体循环）本身都是插件，因此每一个都能从配置中替换（见[架构文档](docs/architecture.zh.md)）。

- **profile** 是组合包的具名组装；`web`、`headless`、`sdk`、`sdk-minimal` 和 `acp` 作为模板随发行版交付。
- **组合包**把 Cordis 配置项与其挂载的代码放在一起，并始终可被其上每一层 patch。
- **步骤**是一次模型请求加上它调用的工具；**轮次**包含零个或多个步骤。
- **模型可见即可重建**：任何进入模型请求的内容都能从会话日志重建。
- **能力 seam** 由 Service Definition、Service Provider 与 Consumer 三者构成，因此替换一个提供方即可改变整个产品。

## 仓库结构

| 路径 | 内容 |
|---|---|
| [`packages/`](packages/README.zh.md) | 按能力族分组的 npm 包 |
| `apps/` | `dsh` CLI、Web GUI 与 Electron 桌面应用 |
| `vendor/` | 固定版本的上游 Cordis 源码 |
| `python/` | Python SDK 及其运行时 wheel 包 |
| `native/` | 原生系统插件 |
| `docs/` | 架构、子系统参考、实操手册与用户指南 |
| `scripts/` | 门禁、生成器与发布工具 |

## 开发者预览

DeepSeek Harness 处于 _开发者预览_ 阶段，正在快速迭代。**未来将出现破坏兼容性的变更。**

运行本项目前，请阅读[安全说明](SAFETY.zh.md)。

<a id="run"></a>

## 运行

### 通过 `npm` 运行

安装 `Node.js`，然后运行：

```sh
npx @deepseek-ai/dsh web
```

该命令默认会在 `http://127.0.0.1:3080` 启动 Web UI，本机启动时还会用默认浏览器打开页面。通过 SSH 启动时只打印宿主机 URL，因为本地转发地址由 SSH 客户端或编辑器持有。传入 `--no-open` 可仅运行服务器而不打开浏览器。详见 [Web UI 指南](docs/user/guide/index.zh.md)。

<a id="run-from-source"></a>

### 从源码运行

如需从仓库源码运行：

```sh
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install
pnpm run build
pnpm dsh web
```

`pnpm run build` 会准备仓库产物。`pnpm dsh web` 会直接使用这些已构建产物，不会重新构建。

## 社区与支持

- 通过 [GitHub Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions) 提交反馈或 bug 报告。
- 为你的插件仓库添加 [`dsh-plugin`](https://github.com/topics/dsh-plugin) 话题，便于被发现。
- 欢迎加入 DeepSeek Harness 企微群：扫码添加企微小助手并填写入群问卷，完成后小助手会邀请你入群。

<table>
  <thead>
    <tr>
      <th align="center">企微小助手</th>
      <th align="center">入群问卷</th>
      <th align="center">微信公众号</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center"><img src="https://cdn.deepseek.com/harness/readme/community-wecom-assistant.png" alt="DeepSeek Harness 企微小助手二维码" width="180" height="180"></td>
      <td align="center"><a href="https://trtgsjkv6r.feishu.cn/share/base/form/shrcnIt5twSVdLGD52KJBckGCgg"><img src="https://cdn.deepseek.com/harness/readme/community-wecom-survey.png" alt="DeepSeek Harness 入群问卷二维码" width="180" height="180"></a></td>
      <td align="center"><img src="https://cdn.deepseek.com/harness/readme/community-wechat-official-account.png" alt="DeepSeek Harness 团队微信公众号二维码" width="180" height="180"></td>
    </tr>
  </tbody>
</table>

## 参与贡献

参见 [CONTRIBUTING.md](CONTRIBUTING.zh.md)。

## 开发

请先阅读[开发指南](docs/development.zh.md)与[架构文档](docs/architecture.zh.md)。

`pnpm run dev:web` 会在一个终端里完成构建、启动，并在源码修改时重建 client bundle；`make help` 列出 Web 与 Desktop 对应的 Make target。完整表格见开发指南的「应用命令」一节。

面向 agent：请遵循 [AGENTS.md](AGENTS.md)。

## 引用

```bibtex
@misc{deepseek-harness2026,
  title={DeepSeek Harness: Everything is a Plugin},
  author={DeepSeek-AI},
  year={2026},
  publisher={GitHub},
  howpublished={\url{https://github.com/deepseek-ai/deepseek-harness}},
}
```

## 许可证

[MIT](LICENSE)

第三方依赖及其许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
