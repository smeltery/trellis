import { describe, expect, it } from "vitest";
import { chooseDevice, type SimctlDevice } from "./device-smoke-runtime";

function device(version: string, name = "iPhone 17 Pro", state = "Shutdown"): SimctlDevice {
  return {
    udid: version,
    name,
    state,
    runtime: `com.apple.CoreSimulator.SimRuntime.iOS-${version}`,
  };
}

describe("device smoke runtime selection", () => {
  it("does not pair Xcode 16 with a newer iPhone runtime", () => {
    const supported = device("18-5", "iPhone 16 Pro");
    expect(chooseDevice([device("26-0"), supported], "18.5").device).toBe(supported);
  });

  it("prefers the newest supported runtime even when an older one has a preferred name", () => {
    const supported = device("18-5", "iPhone 16");
    expect(chooseDevice([device("17-5", "iPhone 17 Pro"), supported], "18.5").device).toBe(
      supported,
    );
  });

  it("reuses a compatible booted simulator but ignores a booted newer guest", () => {
    const booted = device("17-5", "iPhone 15 Pro", "Booted");
    expect(
      chooseDevice([device("26-0", "iPhone 17 Pro", "Booted"), device("18-5"), booted], "18.5"),
    ).toEqual({ device: booted, wasBooted: true });
  });

  it("accepts patch runtimes for the SDK minor version", () => {
    const patched = device("26-3-1");
    expect(chooseDevice([patched], "26.3").device).toBe(patched);
  });

  it("rejects missing compatible runtimes and unavailable devices", () => {
    expect(() =>
      chooseDevice([device("26-0"), { ...device("18-5"), isAvailable: false }], "18.5"),
    ).toThrow("No available iOS simulator compatible with SDK 18.5");
  });
});
