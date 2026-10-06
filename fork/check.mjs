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
for (const [target, source] of Object.entries(JSON.parse(read("fork/asset-map.json")))) {
  assert.deepEqual(readFileSync(target), readFileSync(`fork/branding/${source}`), target);
}
console.log("Trellis identity, assets, native patch digests, and license notices passed.");

assert.equal(
  createHash("sha256").update(readFileSync("LICENSE")).digest("hex"),
  "5fce31b74a03790580196c1324b975d086c4281e9f9260123ae63ae09c63be11",
  "License must match the exact Hab source",
);
