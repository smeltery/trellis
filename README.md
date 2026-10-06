# Trellis

[![CI](https://github.com/smeltery/trellis/actions/workflows/ci.yml/badge.svg)](https://github.com/smeltery/trellis/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/smeltery/trellis)](https://github.com/smeltery/trellis/releases)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-000000?logo=bun&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-47848F?logo=electron&logoColor=white)
[![Flox](https://img.shields.io/badge/dev_environment-Flox-6D5CFF)](docs/maintainers/development.md)
[![License](https://img.shields.io/badge/license-PolyForm_Shield-blue)](LICENSE)

Trellis is a local-first workspace for coding agents. Bring your provider accounts,
organize work into projects and threads, review changes, and use terminals and
Git worktrees from one web or desktop interface.

[Download](https://github.com/smeltery/trellis/releases) · [Documentation](docs/README.md) · [Getting started](docs/user/getting-started.md)

## Develop

```sh
flox activate
bun install --frozen-lockfile
bun run hooks:install
bun run dev
```

Use `bun run dev:desktop` for Electron or `bun run dev:marketing` for the Astro site.
See [development and verification](docs/maintainers/development.md).

## Upstream and license

Trellis is a maintained fork of [Synara](https://github.com/Emanuele-web04/synara).
A [repeatable update process](docs/maintainers/upstream.md) preserves Trellis branding
while incorporating upstream improvements.

The fork uses the exact [license](LICENSE) from `smeltery/hab`.
[Upstream MIT notices](fork/UPSTREAM-LICENSE) remain included with distributions.
