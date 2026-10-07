# Trellis fork overlay

- `rebrand.mjs`: ordered source/path substitutions and canonical artwork/site application.
- `check.mjs`: desktop identity, license distribution, asset bytes, and native patch digest checks.
- `asset-map.json`: canonical sources for every runtime and packaging icon alias.
- `branding/`: canonical Trellis artwork and app screenshots.
- `marketing/`: canonical Astro marketing site based on Loft and Convrt.
- `UPSTREAM-LICENSE`: original MIT attribution, preserved verbatim.
- `sync.mjs`: safe preparation of an upstream merge on a new branch.

See the [upstream guide](../docs/maintainers/upstream.md) and
[development checks](../docs/maintainers/development.md).

## Marketing screenshot

`branding/workspace.png` is an unretouched 1167 × 720 capture of the real
Trellis web UI, refreshed on October 7, 2026 with the sidebar brand mark. It is
rendered by the full-app browser harness in
`apps/web/src/components/ChatView.browser.tsx`. Project names and conversation
content are fictional fixture data; no provider was called. The capture uses the
light theme and rail layout, with startup hints marked as seen.

When refreshing it, render the full router with `mountChatView`, supply a demo
snapshot, wait for fonts and the conversation to settle, and capture with
`page.screenshot`. Keep the actual app controls and styling unchanged.
Copy the image to `fork/marketing/public/workspace.png` and
`apps/marketing/public/workspace.png`, embed it in `branding/og.svg`, and render
`branding/og.png` at 1200 × 630. The site links to the full-size capture; the README
uses the social preview banner.
