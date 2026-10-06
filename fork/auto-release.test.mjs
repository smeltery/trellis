import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const workflow = readFileSync(
  new URL("../.github/workflows/auto-release.yml", import.meta.url),
  "utf8",
);
const script = workflow
  .split("      - name: Compute next patch tag")[1]
  .split("        run: |\n")[1]
  .split("      - name: Dispatch release build")[0]
  .split("\n")
  .map((line) => line.replace(/^          /, ""))
  .join("\n");
function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), "trellis-release-test-"));
  const cwd = join(root, "work");
  const git = (...args) =>
    execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  try {
    execFileSync("git", ["init", "--bare", join(root, "remote")], { stdio: "ignore" });
    execFileSync("git", ["init", cwd], { stdio: "ignore" });
    git("config", "user.name", "Release test");
    git("config", "user.email", "release@example.invalid");
    git("config", "commit.gpgsign", "false");
    git("config", "tag.gpgsign", "false");
    git("remote", "add", "origin", join(root, "remote"));
    git("commit", "--allow-empty", "-m", "initial");
    mkdirSync(join(cwd, "apps/desktop"), { recursive: true });
    writeFileSync(join(cwd, "apps/desktop/package.json"), JSON.stringify({ version: "1.0.0" }));
    run({
      git,
      execute: () => {
        const output = join(root, "output");
        execFileSync("bash", ["-c", script], {
          cwd,
          env: { ...process.env, GITHUB_OUTPUT: output },
          stdio: "pipe",
        });
        return readFileSync(output, "utf8");
      },
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
test("auto-release bootstraps a fork without publishing inherited tags", () =>
  fixture(({ git, execute }) => {
    git("tag", "upstream/v9.0.0");
    assert.match(execute(), /tag=v1.0.0\ncreated=true/);
    assert.equal(git("rev-parse", "v1.0.0"), git("rev-parse", "HEAD"));
  }));
test("auto-release increments only stable tags", () =>
  fixture(({ git, execute }) => {
    git("tag", "v1.2.3");
    git("tag", "v9.0.0-beta.1");
    git("commit", "--allow-empty", "-m", "candidate");
    assert.match(execute(), /tag=v1.2.4\ncreated=true/);
  }));
test("auto-release reuses the tested commit's existing tag", () =>
  fixture(({ git, execute }) => {
    git("tag", "v1.2.3");
    assert.match(execute(), /tag=v1.2.3\ncreated=false/);
  }));
test("dispatch checks out the tested SHA and builds the exact tag", () => {
  assert.match(workflow, /ref: \$\{\{ github.event.workflow_run.head_sha \}\}/);
  assert.match(
    workflow,
    /--ref "\$RELEASE_TAG" -f version="\$RELEASE_TAG" -f publish_release=true/,
  );
  assert.match(workflow, /github.event.workflow_run.event == 'push'/);
});
