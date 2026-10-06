const REPO = "smeltery/trellis";

export const REPO_URL = `https://github.com/${REPO}`;
export const RELEASES_URL = `${REPO_URL}/releases`;

const API_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
const CACHE_KEY = "trellis-latest-release";

export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

export interface Release {
  tag_name: string;
  html_url: string;
  assets: ReleaseAsset[];
}

export type ReleasePlatform = "mac-arm64" | "mac-x64" | "windows-x64" | "linux-x64";

const PLATFORM_ASSET_SUFFIXES: Record<ReleasePlatform, string> = {
  "mac-arm64": "-arm64.dmg",
  "mac-x64": "-x64.dmg",
  "windows-x64": "-x64.exe",
  "linux-x64": "-x64.AppImage",
};

export async function fetchLatestRelease(): Promise<Release> {
  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) return JSON.parse(cached) as Release;

  const data = (await fetch(API_URL).then((response) => response.json())) as Release;

  if (Array.isArray(data?.assets)) {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  }

  return data;
}

export function findReleaseAsset(
  release: Pick<Release, "assets">,
  platform: ReleasePlatform,
): ReleaseAsset | null {
  const suffix = PLATFORM_ASSET_SUFFIXES[platform];
  return release.assets.find((asset) => asset.name.endsWith(suffix)) ?? null;
}
