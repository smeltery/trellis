import { execFileSync } from "node:child_process";
// Keep inherited migration history separate from publishable Trellis tags.
execFileSync(
  "git",
  [
    "fetch",
    "--no-tags",
    "https://github.com/Emanuele-web04/synara.git",
    "refs/tags/v*:refs/tags/upstream/v*",
  ],
  { stdio: "inherit" },
);
