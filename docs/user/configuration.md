# Settings, data, and remote access

Use Settings for appearance, typography, provider preferences, and supported
runtime options. The desktop app keeps its profile separate from the server's
persistent project and conversation state.

| Build       | Default data home   | Desktop identity              |
| ----------- | ------------------- | ----------------------------- |
| Stable      | `~/.trellis`        | `com.smeltery.trellis`        |
| Development | `~/.trellis-dev`    | `com.smeltery.trellis.dev`    |
| Beta        | `~/.trellis-beta`   | `com.smeltery.trellis.beta`   |
| Canary      | `~/.trellis-canary` | `com.smeltery.trellis.canary` |

To back up state, stop Trellis and copy the complete data home. Keep repository
backups separately. Do not delete databases or lock files to force startup.

Server configuration uses the `TRELLIS_` environment prefix, including
`TRELLIS_AUTH_TOKEN` and `TRELLIS_PUBLIC_URL`. Use `bun run start -- --help` to
inspect the current CLI options after building. Remote access requires matching
authentication on the client and server and an HTTPS root origin for the public
URL. Keep local development bound to loopback unless deliberately configuring
remote access.

Stable builds do not run the beta diagnostics collector. In this fork, Beta
also leaves diagnostics and crash reporting disabled unless an operator explicitly
configures `TRELLIS_BETA_DIAGNOSTICS_URL`. No upstream diagnostics destination is
used. In-app feedback delivery requires a configured `VITE_FEEDBACK_ENDPOINT`;
otherwise report problems through [GitHub issues](https://github.com/smeltery/trellis/issues).
