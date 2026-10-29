import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// Temporary bridge until the Flox catalog provides the required Bun release.
// Digests are from oven-sh/bun's bun-v1.4.4/SHASUMS256.txt.
export const bunVersion = "1.4.4";
const artifacts = {
  "darwin-arm64": [
    "bun-darwin-aarch64",
    "c240d7f0ccb90c263a849fcdb09b7ee62630d921348ed6aafda86b9d577bc510",
  ],
  "linux-arm64": [
    "bun-linux-aarch64",
    "baa6bb36f51d6e58561e02bbea825038a9df454f673d6d776e8bbf86f8c7850e",
  ],
  "linux-x64": [
    "bun-linux-x64-baseline",
    "e0446eb55995772eb9894bebae9a6be368d985a8b9271ee124486f9946eedd76",
  ],
};

export function bunArtifact(platform, arch) {
  const artifact = artifacts[`${platform}-${arch}`];
  if (!artifact) throw new Error(`Unsupported Flox Bun platform: ${platform}-${arch}`);
  return { name: artifact[0], sha256: artifact[1] };
}

export function verifyArchive(bytes, expected) {
  if (createHash("sha256").update(bytes).digest("hex") !== expected) {
    throw new Error("Bun archive checksum mismatch; refusing to install it.");
  }
}

export async function bootstrapBun(cacheDir) {
  if (!cacheDir) throw new Error("FLOX_ENV_CACHE is required to bootstrap Bun.");
  const { packageManager } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url)));
  if (packageManager !== `bun@${bunVersion}`) {
    throw new Error("Update the Flox Bun bootstrap version and checksums to match package.json.");
  }
  const artifact = bunArtifact(process.platform, process.arch);
  const destination = join(cacheDir, `bun-${bunVersion}-${process.platform}-${process.arch}`);
  const binary = join(destination, "bun");
  if (existsSync(binary)) {
    if (execFileSync(binary, ["--version"], { encoding: "utf8" }).trim() !== bunVersion) {
      throw new Error(`Unexpected cached Bun version at ${binary}`);
    }
    return destination;
  }

  mkdirSync(cacheDir, { recursive: true });
  const temporary = mkdtempSync(join(cacheDir, ".bun-install-"));
  try {
    console.error(`Installing checksum-verified Bun ${bunVersion} for Flox...`);
    const response = await fetch(
      `https://github.com/oven-sh/bun/releases/download/bun-v${bunVersion}/${artifact.name}.zip`,
      { signal: AbortSignal.timeout(600_000) },
    );
    if (!response.ok) throw new Error(`Bun download failed: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    verifyArchive(bytes, artifact.sha256);
    const archive = join(temporary, "bun.zip");
    writeFileSync(archive, bytes);
    const executable = execFileSync("unzip", ["-p", archive, `${artifact.name}/bun`], {
      maxBuffer: 256 * 1024 * 1024,
    });
    writeFileSync(join(temporary, "bun"), executable, { mode: 0o755 });
    symlinkSync("bun", join(temporary, "bunx"));
    if (
      execFileSync(join(temporary, "bun"), ["--version"], { encoding: "utf8" }).trim() !==
      bunVersion
    ) {
      throw new Error("Downloaded Bun does not report the pinned version.");
    }
    rmSync(archive);
    try {
      renameSync(temporary, destination);
    } catch (error) {
      // Another activation may have completed the same verified install first.
      if (error.code !== "EEXIST" && error.code !== "ENOTEMPTY") throw error;
      if (execFileSync(binary, ["--version"], { encoding: "utf8" }).trim() !== bunVersion)
        throw error;
    }
    return destination;
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(await bootstrapBun(process.env.FLOX_ENV_CACHE));
}
