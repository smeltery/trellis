import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";

// Ordered substitutions form the reviewable fork delta. Keep upstream history intact.
export const substitutions = [
  ["Emanuele-web04/synara", "smeltery/trellis"],
  ["Emanuele-web04/Synara", "smeltery/trellis"],
  ["https://try" + "synara.com/docs", "https://github.com/smeltery/trellis/tree/main/docs"],
  ["https://try" + "synara.com", "https://github.com/smeltery/trellis"],
  ["com.emanueledipietro.synara", "com.smeltery.trellis"],
  ["a8e63b48-d4f3-4db5-9e12-368107afe65d", "aed03d65-b964-44fb-a6c7-32c5b66ac253"],
  ["368107a8-afe6-5db5-ab3b-d4f331684868", "39aa43dd-7bd1-4c20-8ad7-90b7203b7748"],
  ["synara.dev", "trellis.smeltery.dev"],
  ["synara.app", "trellis.smeltery.dev"],
  ["Synara", "Trellis"],
  ["SYNARA", "TRELLIS"],
  ["synara", "trellis"],
];
export function transform(text) {
  for (const [from, to] of substitutions) text = text.replaceAll(from, to);
  return text;
}
export function managed(path) {
  return (
    !/^(fork\/|docs\/|audit\/|evidence\/|advisor-plans\/|plans\/|\.plans\/|\.git\/)/.test(path) &&
    ![
      "LICENSE",
      "README.md",
      "CHANGELOG.md",
      "apps/server/UPSTREAM-LICENSE",
      "apps/desktop/resources/UPSTREAM-LICENSE",
      "scripts/check-brand-identity.ts",
      "scripts/check-brand-identity.test.ts",
    ].includes(path)
  );
}
export function main() {
  const check = process.argv.includes("--check");
  const files = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { encoding: "utf8" },
  )
    .split("\0")
    .filter(Boolean);
  let changes = 0;
  for (const path of new Set(files)) {
    if (!managed(path) || !existsSync(path)) continue;
    const bytes = readFileSync(path);
    const target = transform(path);
    const contents = bytes.includes(0) ? bytes : Buffer.from(transform(bytes.toString("utf8")));
    if (target === path && bytes.equals(contents)) continue;
    changes++;
    if (check) {
      console.error(`Unapplied branding: ${path}`);
      continue;
    }
    if (target !== path && existsSync(target)) throw new Error(`Rename collision: ${target}`);
    mkdirSync(dirname(target), { recursive: true });
    if (target !== path) renameSync(path, target);
    writeFileSync(target, contents);
  }
  if (!check) {
    // Native patches are branded too: pin the actual bytes, never reuse upstream binaries.
    const manifestPath = "packages/shared/src/cuaDriverRelease.json";
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    for (const [field, patch] of [
      ["patchSha256", "0001-trellis-native.patch"],
      ["linuxBrowserPatchSha256", "0002-trellis-linux-browser.patch"],
    ]) {
      manifest[field] = createHash("sha256")
        .update(readFileSync(`apps/desktop/patches/cua-driver/${patch}`))
        .digest("hex");
    }
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    rmSync("apps/marketing", { recursive: true, force: true });
    cpSync("fork/marketing", "apps/marketing", { recursive: true });
    cpSync("fork/branding", "assets", { recursive: true });
    const copies = {
      "apps/web/public/trellis-logo.svg": "trellis-logo.svg",
      "apps/web/public/trellis.png": "trellis-universal-1024.png",
      "apps/web/public/favicon.ico": "trellis-web-favicon.ico",
      "apps/web/public/favicon-16x16.png": "trellis-web-favicon-16x16.png",
      "apps/web/public/favicon-32x32.png": "trellis-web-favicon-32x32.png",
      "apps/web/public/apple-touch-icon.png": "trellis-web-apple-touch-180.png",
      "apps/web/public/app-icons/default.png": "trellis-macos-1024.png",
      "apps/web/public/app-icons/dark.png": "black-macos-1024.png",
      "apps/web/public/app-icons/beta.png": "trellis-macos-1024.png",
      "apps/desktop/resources/trellis.png": "trellis-universal-1024.png",
      "apps/desktop/resources/icon.png": "trellis-universal-1024.png",
      "apps/desktop/resources/app-icon-linux.png": "trellis-universal-1024.png",
      "apps/desktop/resources/app-icon-macos.png": "trellis-macos-1024.png",
      "apps/desktop/resources/dock-icon.png": "trellis-macos-1024.png",
      "apps/desktop/resources/dock-icon-dark.png": "black-macos-1024.png",
      "apps/desktop/resources/icon.ico": "trellis-windows.ico",
      "apps/desktop/resources/app-icon-windows.ico": "trellis-windows.ico",
      "apps/desktop/resources/dmgly/assets/app-icon.png": "trellis-macos-1024.png",
    };
    for (const [destination, source] of Object.entries(copies))
      cpSync(`fork/branding/prod/${source}`, destination);
  }
  if (check && changes) process.exitCode = 1;
  else
    console.log(
      check
        ? "Trellis branding substitutions are current."
        : `Applied Trellis branding to ${changes} files.`,
    );
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
