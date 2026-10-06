# Trellis fork overlay

- `rebrand.mjs`: ordered source/path substitutions and canonical artwork/site application.
- `check.mjs`: desktop identity, license distribution, asset bytes, and native patch digest checks.
- `asset-map.json`: canonical sources for every runtime and packaging icon alias.
- `branding/`: supplied Trellis artwork, copied from the user's asset bundle.
- `marketing/`: canonical Astro marketing site based on Loft and Convrt.
- `UPSTREAM-LICENSE`: original MIT attribution, preserved verbatim.
- `sync.mjs`: safe preparation of an upstream merge on a new branch.

See the [upstream guide](../docs/maintainers/upstream.md) and
[development checks](../docs/maintainers/development.md).
