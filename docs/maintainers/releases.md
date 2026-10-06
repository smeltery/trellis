# Automatic releases

The automatic release workflow follows `smeltery/hab`: after successful CI on a
push to `main`, find the newest stable semantic tag, increment its patch version,
create the tag, and explicitly dispatch the release build. Prerelease tags are
excluded. With no fork release tags, the initial version comes from the desktop
package manifest, keeping it above the inherited compatibility floor. The tag points to the exact tested commit, not a newer main HEAD.
Re-running dispatch for an existing tag supports recovery from a failed build.

```mermaid
sequenceDiagram
  participant CI
  participant Auto as Auto release
  participant Git as Git tags
  participant Build as Desktop release
  CI->>Auto: Successful main push
  Auto->>Git: Tag exact tested SHA
  Auto->>Build: Dispatch version and publish flag at tag
  Build->>Build: Quality, native builds, signing, provenance
  Build->>Git: Publish installers and update manifests
```

The existing multi-platform release pipeline remains authoritative. GitHub's
workflow token does not trigger tag-push workflows recursively, so the explicit
workflow dispatch is necessary. Publication uses the fork repository and Trellis
update channels; no Synara release or feed is modified.

Signing is preferred, but the fork also supports explicitly authorized unsigned
releases. Set the repository Actions variable `TRELLIS_ALLOW_UNSIGNED_RELEASE=1`
to permit macOS and Windows publication without signing credentials. Unset it to
require signing again. Complete signing credentials always take precedence.
Unsigned artifacts record `unsigned-explicit-release` in their provenance; they
are not represented as signed or notarized. Release notes and the download page
explain Gatekeeper and SmartScreen warnings. Windows Defender verification,
artifact hashes, source/lockfile verification, and all quality gates still apply.

For signed releases, configure Apple signing/notarization and Windows signing
credentials described in the inherited [release reference](../release.md). Use
`TRELLIS_` in place of its historical environment prefix, and `smeltery/trellis`
as the update repository. Optional CLI publishing requires a separately
configured npm package and trusted publisher.

Validate without publishing:

```sh
gh workflow run release.yml --ref BRANCH -f version=1.0.1 -f publish_release=false
```

Inspect all platform results and install the artifacts on each target OS before
claiming platform qualification. The fork uses the exact Hab license at the root;
the original MIT notice is retained in `fork/UPSTREAM-LICENSE` and shipped in
server and desktop resources alongside the fork license.
