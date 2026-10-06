import { execFileSync, spawnSync } from "node:child_process";
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
if (git("status", "--porcelain")) throw new Error("Commit or stash changes before syncing.");
const expected = "https://github.com/Emanuele-web04/synara.git";
const remote = git("remote").split("\n");
if (!remote.includes("upstream")) git("remote", "add", "upstream", expected);
if (git("remote", "get-url", "upstream") !== expected)
  throw new Error("Unexpected upstream remote; inspect it before syncing.");
git("fetch", "upstream", "main");
const commit = git("rev-parse", "upstream/main");
if (spawnSync("git", ["merge-base", "--is-ancestor", commit, "HEAD"]).status === 0) {
  console.log("Already contains the latest upstream commit.");
  process.exit(0);
}
git("switch", "-c", `sync/synara-${commit.slice(0, 12)}`);
git("config", "rerere.enabled", "true");
const result = spawnSync("git", ["merge", "--no-commit", "--no-ff", "upstream/main"], {
  stdio: "inherit",
});
if (result.status !== 0) {
  console.error(
    "Resolve conflicts, preserving fork-owned branding/site/CI. Then run bun run brand:apply, bun install, and bun run check. See docs/maintainers/upstream.md.",
  );
  process.exit(result.status ?? 1);
}
execFileSync("node", ["fork/rebrand.mjs"], { stdio: "inherit" });
console.log(
  "Merge prepared, not committed. Run bun install and bun run check; review the diff, commit, and open a PR.",
);
