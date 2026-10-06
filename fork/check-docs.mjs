import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { JSDOM } from "jsdom";

execFileSync("bunx", ["--no-install", "markdownlint-cli2"], { stdio: "inherit" });
const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
const { default: mermaid } = await import("mermaid");
mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter((path) =>
    /^(README\.md|docs\/README\.md|docs\/(user|maintainers)\/.*\.md|fork\/README\.md)$/.test(path),
  );
let diagrams = 0;
for (const file of new Set(files)) {
  if (!existsSync(file)) continue;
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(/^```mermaid\s*\n([\s\S]*?)^```/gm)) {
    try {
      await mermaid.parse(match[1]);
      diagrams++;
    } catch (error) {
      throw new Error(`${file}: invalid Mermaid`, { cause: error });
    }
  }
  for (const match of text.matchAll(/\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const target = match[1].split("#")[0];
    if (!target || /^[a-z]+:/i.test(target)) continue;
    if (!existsSync(resolve(dirname(file), decodeURIComponent(target))))
      throw new Error(`${file}: broken link ${target}`);
  }
}
console.log(`Validated ${diagrams} Mermaid diagrams and local documentation links.`);
