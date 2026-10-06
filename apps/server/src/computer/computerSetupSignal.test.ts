import { TRELLIS_DESKTOP_BUNDLE_ID_ENV } from "@trellis/shared/desktopIdentity";
import { afterEach, describe, expect, it } from "vitest";

import { ComputerBackendError } from "./ComputerBackend.ts";
import { computerSetupSignal, responsibleDesktopBundleId } from "./computerSetupSignal.ts";

const previousBundleId = process.env[TRELLIS_DESKTOP_BUNDLE_ID_ENV];

afterEach(() => {
  if (previousBundleId === undefined) {
    delete process.env[TRELLIS_DESKTOP_BUNDLE_ID_ENV];
  } else {
    process.env[TRELLIS_DESKTOP_BUNDLE_ID_ENV] = previousBundleId;
  }
});

describe("responsibleDesktopBundleId", () => {
  it("reads the desktop shell's identifier, and treats blank as unknown", () => {
    expect(responsibleDesktopBundleId({ [TRELLIS_DESKTOP_BUNDLE_ID_ENV]: " com.x.trellis " })).toBe(
      "com.x.trellis",
    );
    expect(responsibleDesktopBundleId({ [TRELLIS_DESKTOP_BUNDLE_ID_ENV]: "   " })).toBeUndefined();
    expect(responsibleDesktopBundleId({})).toBeUndefined();
  });
});

describe("computerSetupSignal", () => {
  const setupError = new ComputerBackendError("denied", { setupRequired: true });

  it("carries the responsible app onto every signal it raises", () => {
    // The card's recovery advice names this app in a `tccutil reset`; naming the
    // wrong one revokes a different Trellis's grants.
    process.env[TRELLIS_DESKTOP_BUNDLE_ID_ENV] = "com.smeltery.trellis.dev";
    expect(
      computerSetupSignal({
        availability: {
          kind: "permission-required",
          missing: ["accessibility"],
          message: "needs Accessibility",
          buildSignature: "adhoc",
        },
      }),
    ).toEqual({
      missing: ["accessibility"],
      blocking: true,
      buildSignature: "adhoc",
      bundleId: "com.smeltery.trellis.dev",
    });
    expect(computerSetupSignal({ error: setupError, missing: [] })).toEqual({
      missing: [],
      blocking: true,
      bundleId: "com.smeltery.trellis.dev",
    });
    // Screen Recording alone degrades perception without stopping input.
    expect(computerSetupSignal({ missing: ["screenRecording"] })).toEqual({
      missing: ["screenRecording"],
      blocking: false,
      bundleId: "com.smeltery.trellis.dev",
    });
  });

  it("omits the app entirely when no desktop shell is responsible for this server", () => {
    // A bare `bun run` server has no app behind it, and an absent field is what
    // makes the card withhold the Terminal command rather than guess.
    delete process.env[TRELLIS_DESKTOP_BUNDLE_ID_ENV];
    const signal = computerSetupSignal({ error: setupError, missing: ["accessibility"] });
    expect(signal).toEqual({ missing: ["accessibility"], blocking: true });
    expect(signal && "bundleId" in signal).toBe(false);
  });

  it("still reports nothing to do when no grant is missing and nothing failed", () => {
    process.env[TRELLIS_DESKTOP_BUNDLE_ID_ENV] = "com.smeltery.trellis";
    expect(computerSetupSignal({ missing: [] })).toBeUndefined();
    expect(computerSetupSignal({ error: new Error("window moved"), missing: [] })).toBeUndefined();
  });
});
