# DeepSeek Harness

English | [中文](README.zh.md)

DeepSeek Harness (`dsh`) is an open-source agent harness developed by [DeepSeek AI](https://deepseek.com).

It is built on an **everything-is-a-plugin** architecture and powered by [Cordis](https://github.com/cordiverse/cordis), whose design is described in [_A Programming Paradigm for Spatiotemporal Composability_](https://arxiv.org/abs/2608.25512).

Documentation: [https://deepseek-harness.github.io/deepseek-harness/](https://deepseek-harness.github.io/deepseek-harness/)

## Overview

DeepSeek Harness turns a model into a working agent: it assembles the system prompt and tool schemas, streams each model request, runs the tools the model calls, and records everything the model can observe in a durable session log that resume, fork, transcripts, and the Web UI read back.

The product is a plugin tree rather than a fixed program: a profile composes ordered bundles at boot, and any configuration row they install can be replaced or patched. The capability families are:

- **Models** — model adapters registered on `ctx.llm`.
- **Tools** — shell, filesystem, search, web fetch, terminals, background jobs, subagents, skills, and todo tracking, each registered on `ctx.tools`.
- **Execution** — one filesystem, subprocess, and sandbox provider set keeps Bash, PTY, and LSP on the local machine or inside a remote sandbox.
- **Sessions** — an append-only event log backs resume, fork, transcripts, and session search.
- **Entry points** — the `dsh` CLI, the Web GUI, the TypeScript and Python SDKs, and an automation-only ACP server.

## Architecture

There is no privileged core to patch: the model adapter, the tool registry, the session log, and the agent loop itself are plugins, so each is replaceable from configuration ([architecture](docs/architecture.md)).

- A **profile** is a named composition of bundles; `web`, `headless`, `sdk`, `sdk-minimal`, and `acp` ship as templates.
- A **bundle** packages Cordis configuration rows with the code they mount, and stays patchable by every layer above it.
- A **step** is one model request plus the tools it calls; a **turn** is zero or more steps.
- **Model-visible means logged**: everything that reaches a model request is reconstructable from the session log.
- A **capability seam** joins a Service Definition, a Service Provider, and a Consumer, so replacing one provider changes the whole product.

## Repository layout

| Path | Contents |
|---|---|
| [`packages/`](packages/README.md) | The npm packages, grouped by capability family |
| `apps/` | The `dsh` CLI, the Web GUI, and the Electron desktop application |
| `vendor/` | Pinned upstream Cordis source |
| `python/` | The Python SDK and its runtime wheel |
| `native/` | The native system addon |
| `docs/` | Architecture, subsystem references, cookbooks, and user guides |
| `scripts/` | Gates, generators, and release tooling |

## Developer preview

DeepSeek Harness is in _developer preview_ and iterating rapidly. **THERE WILL BE COMPATIBILITY-BREAKING CHANGES.**

Review the [safety notice](SAFETY.md) before running the project.

## Run

### Run from `npm`

Install `Node.js`, then run:

```sh
npx @deepseek-ai/dsh web
```

The command starts the Web UI at `http://127.0.0.1:3080` by default and opens it in the default browser for a local launch. An SSH launch only prints the host URL because the SSH client or editor owns the local forwarded address. Pass `--no-open` to run the server without opening a browser. See [Web UI guide](docs/user/guide/index.md).

### Run from source

To run from a repository checkout:

```sh
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install
pnpm run build
pnpm dsh web
```

`pnpm run build` prepares the repository artifacts. `pnpm dsh web` uses those built artifacts without rebuilding.

## Community and support

- Submit feedback or bug reports through [GitHub Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions).
- Add the [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic to your plugin repository for discoverability.
- Join <a href="https://discord.gg/Ycq5dCaS4">DeepSeek Harness Discord community</a>.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Development

Start with the [development guide](docs/development.md) and [architecture documentation](docs/architecture.md).

`pnpm run dev:web` builds, serves, and rebuilds client bundles on source edits in one terminal, and `make help` lists the matching Make targets for Web and Desktop; the guide's application commands section owns the full table.

For agents, follow [AGENTS.md](AGENTS.md).

## Citation

```bibtex
@misc{deepseek-harness2026,
  title={DeepSeek Harness: Everything is a Plugin},
  author={DeepSeek-AI},
  year={2026},
  publisher={GitHub},
  howpublished={\url{https://github.com/deepseek-ai/deepseek-harness}},
}
```

## License

[MIT](LICENSE)

Third-party dependencies and their licenses are disclosed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
