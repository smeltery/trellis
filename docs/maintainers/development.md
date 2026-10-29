# Development, Flox, and CI

Flox is the reproducible development entry point. Its committed manifest and
lockfile supply Node 24, Git, pre-commit, actionlint, ShellCheck, and unzip. Until
the Flox catalog carries Bun 1.4.4, activation downloads that exact official
release through `fork/bootstrap-bun.mjs`, verifies its pinned SHA-256 digest, and
caches it in `FLOX_ENV_CACHE`. First activation requires GitHub access; subsequent
activations reuse the cached binary. Linux uses the official glibc builds (the
x64 baseline avoids requiring AVX2). The bootstrap must track `packageManager`
in `package.json`; return Bun to the manifest once the catalog catches up. The locked
environment supports Apple Silicon macOS and x64/ARM64 Linux. Windows and Intel
Mac developers can use the versions in `package.json` directly; Windows runtime
checks remain native GitHub Actions jobs.

```sh
flox activate
bun install --frozen-lockfile
bun run hooks:install
bun run dev
```

Use `bun run dev:desktop` for Electron and `bun run dev:marketing` for Astro.
Flox also defines `web` and `marketing` services; use `flox services start web`
inside an activation. Keep production state separate from development instances.

```mermaid
flowchart LR
  Edit[Edit code or docs] --> Commit[Pre-commit static checks]
  Commit --> Push[Pre-push types, tests, builds]
  Push --> CI[GitHub Actions]
  CI --> Browser[Browser and native platform checks]
  Browser --> Gate[Required quality gate]
```

| Command                    | Purpose                                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `bun run check:static`     | Branding, localization, Markdown, Mermaid, links, formatting, lint, CI contracts, Windows boundary, release smoke |
| `bun run check`            | Static checks, workspace types/tests, desktop and marketing builds                                                |
| `bun run docs:check`       | Markdown style, real Mermaid parsing, local link existence                                                        |
| `bun run test`             | Vitest workspace tests; do not substitute `bun test`                                                              |
| `bun run migrations:check` | Released migration lineage; requires fetched release tags                                                         |
| `actionlint`               | GitHub Actions syntax validation                                                                                  |

Hooks call the same commands as CI through Flox. Browser and native OS checks run
in CI on their intended platforms. Install Chromium before running browser tests
locally. Markdown linting covers the maintained README and Trellis guides;
historical upstream evidence is preserved separately from this maintained scope.

Bun manages dependencies, lockfiles, workspace tasks, and suitable scripts. Node
24 remains required for the existing tooling and Electron-related paths. A runtime
migration is a separate change requiring platform validation.
