import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { bunArtifact, bunVersion, verifyArchive } from "./bootstrap-bun.mjs";

test("the Flox bootstrap tracks the required package manager", () => {
  const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url)));
  assert.equal(manifest.packageManager, `bun@${bunVersion}`);
});

test("all supported Flox systems have pinned archives", () => {
  for (const [platform, arch] of [
    ["darwin", "arm64"],
    ["linux", "arm64"],
    ["linux", "x64"],
  ]) {
    const artifact = bunArtifact(platform, arch);
    assert.match(artifact.sha256, /^[a-f0-9]{64}$/);
    if (platform === "linux") assert.doesNotMatch(artifact.name, /musl/);
  }
  assert.throws(() => bunArtifact("win32", "x64"), /Unsupported/);
});

test("archive verification rejects corrupted bytes before extraction", () => {
  const bytes = Buffer.from("expected archive");
  const digest = createHash("sha256").update(bytes).digest("hex");
  verifyArchive(bytes, digest);
  assert.throws(() => verifyArchive(Buffer.from("corrupt archive"), digest), /checksum mismatch/);
});
