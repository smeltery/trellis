import assert from "node:assert/strict";
import { test } from "node:test";
import { transform, managed } from "./rebrand.mjs";
test("branding is deterministic and idempotent across public identities", () => {
  const source =
    "@synara/shared Synara SYNARA_HOME .synara com.emanueledipietro.synara Emanuele-web04/synara";
  const expected =
    "@trellis/shared Trellis TRELLIS_HOME .trellis com.smeltery.trellis smeltery/trellis";
  assert.equal(transform(source), expected);
  assert.equal(transform(expected), expected);
});
test("the two Windows installers get independent identities", () => {
  for (const id of [
    "a8e63b48-d4f3-4db5-9e12-368107afe65d",
    "368107a8-afe6-5db5-ab3b-d4f331684868",
  ]) {
    assert.notEqual(transform(id), id);
    assert.equal(transform(transform(id)), transform(id));
  }
});
test("legal provenance and historical evidence are excluded; active source is checked", () => {
  for (const path of [
    "fork/UPSTREAM-LICENSE",
    "docs/computer-use-cua/evidence/report.json",
    "LICENSE",
    "CHANGELOG.md",
    "apps/server/UPSTREAM-LICENSE",
  ])
    assert.equal(managed(path), false);
  assert.equal(managed("apps/web/src/branding.ts"), true);
  assert.equal(managed("apps/desktop/patches/cua-driver/0001-synara-native.patch"), true);
});
