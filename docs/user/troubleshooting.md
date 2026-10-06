# Troubleshooting

| Symptom                       | Check                                                                                                             |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Provider unavailable          | Confirm its CLI is installed, on PATH, and authenticated in the server environment.                               |
| Browser cannot connect        | Confirm server address, port, and matching authentication; check both IPv4 and IPv6 listeners.                    |
| App reports a database lock   | Stop duplicate instances and inspect logs. Preserve unknown locks and data.                                       |
| Computer-use permissions fail | Grant permissions to the Trellis app identity, then restart the affected app. Synara permissions do not transfer. |
| Update unavailable            | Check the Trellis releases page and your stable/beta channel. Trellis never updates from Synara's feed.           |
| Development tools differ      | Enter `flox activate` and reinstall with the committed Bun lockfile.                                              |

When reporting a problem, include the Trellis version, OS/architecture, provider
CLI version, expected behavior, and a minimal reproduction. Review logs for
private paths and credentials before sharing them.

For source builds, see [development checks](../maintainers/development.md).
