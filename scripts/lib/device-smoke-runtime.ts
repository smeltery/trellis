export interface SimctlDevice {
  readonly udid: string;
  readonly name: string;
  readonly state: string;
  readonly isAvailable?: boolean;
  readonly runtime: string;
}

const PREFERRED_DEVICE_TYPES = ["iPhone 17 Pro", "iPhone 16 Pro", "iPhone 15 Pro", "iPhone"];

function versionPair(version: string): number {
  const match = /^(\d+)[.-](\d+)/.exec(version);
  if (!match) throw new Error(`Invalid iOS version: ${version}`);
  return Number(match[1]) * 1000 + Number(match[2]);
}

/** Do not exercise an older SimulatorKit against a newer guest runtime. */
export function chooseDevice(
  devices: readonly SimctlDevice[],
  sdkVersion: string,
): { device: SimctlDevice; wasBooted: boolean } {
  const sdk = versionPair(sdkVersion);
  const compatible = devices
    .filter((device) => {
      const runtime = device.runtime.split(".SimRuntime.iOS-")[1];
      return device.isAvailable !== false && runtime !== undefined && versionPair(runtime) <= sdk;
    })
    .sort((a, b) => b.runtime.localeCompare(a.runtime, undefined, { numeric: true }));
  const booted = compatible.find((device) => device.state === "Booted");
  if (booted) return { device: booted, wasBooted: true };
  // Prefer the newest compatible runtime, then a modern iPhone within it.
  const newest = compatible.filter((device) => device.runtime === compatible[0]?.runtime);
  for (const preference of PREFERRED_DEVICE_TYPES) {
    const device = newest.find((candidate) => candidate.name.startsWith(preference));
    if (device) return { device, wasBooted: false };
  }
  const device = newest[0];
  if (device) return { device, wasBooted: false };
  throw new Error(
    `No available iOS simulator compatible with SDK ${sdkVersion}; install a matching runtime in Xcode`,
  );
}
