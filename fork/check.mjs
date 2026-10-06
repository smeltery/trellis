import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
const read = (path) => readFileSync(path, "utf8");
const manifest = JSON.parse(read("packages/shared/src/cuaDriverRelease.json"));
for (const [field, path] of [
  ["patchSha256", "0001-trellis-native.patch"],
  ["linuxBrowserPatchSha256", "0002-trellis-linux-browser.patch"],
]) {
  assert.equal(
    createHash("sha256")
      .update(readFileSync(`apps/desktop/patches/cua-driver/${path}`))
      .digest("hex"),
    manifest[field],
    `Native patch provenance: ${path}`,
  );
}
assert.match(read("packages/shared/src/desktopIdentity.ts"), /com\.smeltery\.trellis/);
assert.match(
  read("packages/shared/src/desktopIdentity.ts"),
  /defaultHomeDirectoryName: "\.trellis"/,
);
assert.match(read("LICENSE"), /^PolyForm Shield License 1\.0\.0/);
for (const base of ["apps/desktop/resources", "apps/server"]) {
  assert.equal(read(`${base}/LICENSE`), read("LICENSE"));
  assert.equal(read(`${base}/UPSTREAM-LICENSE`), read("fork/UPSTREAM-LICENSE"));
}
for (const [source, target] of [
  ["trellis-web-favicon.ico", "apps/web/public/favicon.ico"],
  ["trellis-logo.svg", "apps/web/public/trellis-logo.svg"],
  ["trellis-windows.ico", "apps/desktop/resources/icon.ico"],
  ["trellis-macos-1024.png", "apps/desktop/resources/app-icon-macos.png"],
])
  assert.deepEqual(readFileSync(target), readFileSync(`fork/branding/prod/${source}`), target);
console.log("Trellis identity, assets, native patch digests, and license notices passed.");
