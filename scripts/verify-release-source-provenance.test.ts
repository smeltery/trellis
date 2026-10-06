import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

it("releases a new tag from tested source without requiring a prior manifest bump", () => {
  const root = mkdtempSync(join(tmpdir(), "trellis-source-proof-"));
  roots.push(root);
  mkdirSync(join(root, "scripts/lib"), { recursive: true });
  for (const file of ["verify-release-source-provenance.ts", "lib/release-github-output.ts"]) {
    cpSync(new URL(file, import.meta.url), join(root, "scripts", file));
  }
  writeFileSync(join(root, "bun.lock"), "fixture lock");
  writeFileSync(join(root, "package.json"), JSON.stringify({ type: "module", version: "1.0.0" }));
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  git("init", "-q");
  git("add", ".");
  git(
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.invalid",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-qm",
    "fixture",
  );
  const sha = git("rev-parse", "HEAD");
  git("-c", "tag.gpgsign=false", "tag", "v1.0.3");
  const verify = (version = "1.0.3", commit = sha) =>
    spawnSync(
      process.execPath,
      [
        join(root, "scripts/verify-release-source-provenance.ts"),
        version,
        "v1.0.3",
        "true",
        commit,
        "tag",
        "v1.0.3",
      ],
      { cwd: root, encoding: "utf8", env: { ...process.env, GITHUB_OUTPUT: "" } },
    );
  const valid = verify();
  expect(valid.status, valid.stderr).toBe(0);
  expect(JSON.parse(valid.stdout).source_commit).toBe(sha);
  expect(verify("1.0.4").stderr).toContain("same semantic version");
  expect(verify("1.0.3", "a".repeat(40)).stderr).toContain("does not match workflow commit");
  writeFileSync(join(root, "bun.lock"), "modified");
  expect(verify().stderr).toContain("worktree is not clean");
});
