import { describe, expect, it } from "vitest";

import {
  desktopUpdateChannel,
  resolveTrellisDesktopFlavor,
  resolveTrellisDesktopRuntimeFlavor,
  canOverrideDesktopSmokeUserData,
  TRELLIS_SOURCE_DESKTOP_BUILD_MARKER,
  TRELLIS_BETA_BUNDLE_ID,
  TRELLIS_BETA_DESKTOP_ENTRY_URL,
  TRELLIS_BETA_DESKTOP_ORIGIN,
  TRELLIS_CANARY_BUNDLE_ID,
  TRELLIS_CANARY_DESKTOP_ENTRY_URL,
  TRELLIS_CANARY_DESKTOP_ORIGIN,
  TRELLIS_CUA_BUNDLE_ID,
  TRELLIS_CUA_DESKTOP_ENTRY_URL,
  TRELLIS_CUA_DESKTOP_ORIGIN,
  TRELLIS_DESKTOP_ENTRY_URL,
  TRELLIS_DESKTOP_ORIGIN,
  TRELLIS_DESKTOP_UPDATE_CHANNEL,
  TRELLIS_DEVELOPMENT_BUNDLE_ID,
  TRELLIS_PRODUCTION_BUNDLE_ID,
  trellisDesktopIdentity,
} from "./desktopIdentity";

describe("desktopIdentity", () => {
  it("uses the exact canonical production and development bundle IDs", () => {
    expect(TRELLIS_PRODUCTION_BUNDLE_ID).toBe("com.smeltery.trellis");
    expect(TRELLIS_DEVELOPMENT_BUNDLE_ID).toBe("com.smeltery.trellis.dev");
    expect(trellisDesktopIdentity("production").bundleId).toBe(TRELLIS_PRODUCTION_BUNDLE_ID);
    expect(trellisDesktopIdentity("development").bundleId).toBe(TRELLIS_DEVELOPMENT_BUNDLE_ID);
  });

  it("uses the exact packaged renderer origin and entry URL", () => {
    expect(TRELLIS_DESKTOP_ORIGIN).toBe("trellis://app");
    expect(TRELLIS_DESKTOP_ENTRY_URL).toBe("trellis://app/index.html");
  });

  it("uses the isolated Trellis desktop update channel", () => {
    expect(TRELLIS_DESKTOP_UPDATE_CHANNEL).toBe("trellis");
  });

  it("matches the beta update channel to prerelease tags and keeps trellis otherwise", () => {
    expect(desktopUpdateChannel("beta")).toBe("beta");
    expect(desktopUpdateChannel("production")).toBe(TRELLIS_DESKTOP_UPDATE_CHANNEL);
    expect(desktopUpdateChannel("canary")).toBe(TRELLIS_DESKTOP_UPDATE_CHANNEL);
    expect(desktopUpdateChannel("development")).toBe(TRELLIS_DESKTOP_UPDATE_CHANNEL);
  });

  it("gives Canary a fully separate desktop identity and storage profile", () => {
    expect(TRELLIS_CANARY_BUNDLE_ID).toBe("com.smeltery.trellis.canary");
    expect(TRELLIS_CANARY_DESKTOP_ORIGIN).toBe("trellis-canary://app");
    expect(TRELLIS_CANARY_DESKTOP_ENTRY_URL).toBe("trellis-canary://app/index.html");
    expect(trellisDesktopIdentity("canary")).toEqual({
      flavor: "canary",
      displayName: "Trellis Canary",
      bundleId: TRELLIS_CANARY_BUNDLE_ID,
      scheme: "trellis-canary",
      origin: TRELLIS_CANARY_DESKTOP_ORIGIN,
      entryUrl: TRELLIS_CANARY_DESKTOP_ENTRY_URL,
      userDataDirectoryName: "trellis-canary",
      defaultHomeDirectoryName: ".trellis-canary",
      usesScriptedUpdates: true,
    });
  });

  it("gives Cua a fully separate desktop identity and storage profile", () => {
    expect(TRELLIS_CUA_BUNDLE_ID).toBe("com.smeltery.trellis.cua");
    expect(TRELLIS_CUA_DESKTOP_ORIGIN).toBe("trellis-cua://app");
    expect(TRELLIS_CUA_DESKTOP_ENTRY_URL).toBe("trellis-cua://app/index.html");
    expect(trellisDesktopIdentity("cua")).toEqual({
      flavor: "cua",
      displayName: "Trellis Cua",
      bundleId: TRELLIS_CUA_BUNDLE_ID,
      scheme: "trellis-cua",
      origin: TRELLIS_CUA_DESKTOP_ORIGIN,
      entryUrl: TRELLIS_CUA_DESKTOP_ENTRY_URL,
      userDataDirectoryName: "trellis-cua",
      defaultHomeDirectoryName: ".trellis-cua",
      usesScriptedUpdates: true,
    });
  });

  it("gives Beta a fully separate desktop identity and storage profile", () => {
    expect(TRELLIS_BETA_BUNDLE_ID).toBe("com.smeltery.trellis.beta");
    expect(TRELLIS_BETA_DESKTOP_ORIGIN).toBe("trellis-beta://app");
    expect(TRELLIS_BETA_DESKTOP_ENTRY_URL).toBe("trellis-beta://app/index.html");
    expect(trellisDesktopIdentity("beta")).toEqual({
      flavor: "beta",
      displayName: "Trellis Beta",
      bundleId: TRELLIS_BETA_BUNDLE_ID,
      scheme: "trellis-beta",
      origin: TRELLIS_BETA_DESKTOP_ORIGIN,
      entryUrl: TRELLIS_BETA_DESKTOP_ENTRY_URL,
      userDataDirectoryName: "trellis-beta",
      defaultHomeDirectoryName: ".trellis-beta",
      usesScriptedUpdates: false,
    });
  });

  it("selects explicit source flavors without changing packaged Stable", () => {
    expect(resolveTrellisDesktopFlavor({ isDevelopment: false })).toBe("production");
    expect(resolveTrellisDesktopFlavor({ isDevelopment: true })).toBe("development");
    expect(
      resolveTrellisDesktopFlavor({ isDevelopment: false, requestedFlavor: "development" }),
    ).toBe("production");
    expect(
      resolveTrellisDesktopFlavor({
        isDevelopment: false,
        requestedFlavor: "development",
        allowDevelopmentOverride: true,
      }),
    ).toBe("development");
    expect(resolveTrellisDesktopFlavor({ isDevelopment: false, requestedFlavor: " canary " })).toBe(
      "canary",
    );
    expect(resolveTrellisDesktopFlavor({ isDevelopment: true, requestedFlavor: "canary" })).toBe(
      "canary",
    );
    expect(resolveTrellisDesktopFlavor({ isDevelopment: false, requestedFlavor: "cua" })).toBe(
      "cua",
    );
    expect(resolveTrellisDesktopFlavor({ isDevelopment: true, requestedFlavor: "CUA" })).toBe(
      "cua",
    );
    expect(resolveTrellisDesktopFlavor({ isDevelopment: false, requestedFlavor: "beta" })).toBe(
      "beta",
    );
    expect(resolveTrellisDesktopFlavor({ isDevelopment: false, requestedFlavor: " beta " })).toBe(
      "beta",
    );
    expect(resolveTrellisDesktopFlavor({ isDevelopment: true, requestedFlavor: "beta" })).toBe(
      "beta",
    );
  });

  it("isolates development and Canary homes from packaged Stable", () => {
    expect(trellisDesktopIdentity("development").defaultHomeDirectoryName).toBe(".trellis-dev");
    expect(trellisDesktopIdentity("canary").defaultHomeDirectoryName).toBe(".trellis-canary");
    expect(trellisDesktopIdentity("cua").defaultHomeDirectoryName).toBe(".trellis-cua");
    expect(trellisDesktopIdentity("beta").defaultHomeDirectoryName).toBe(".trellis-beta");
    expect(trellisDesktopIdentity("production").defaultHomeDirectoryName).toBe(".trellis");
  });

  it.each(["production", "canary", "cua", "beta"] as const)(
    "uses the immutable %s package flavor despite inherited source settings",
    (packagedFlavor) => {
      expect(
        resolveTrellisDesktopRuntimeFlavor({
          isPackaged: true,
          isDevelopment: true,
          packagedFlavor,
          requestedFlavor: "development",
          allowDevelopmentOverride: true,
        }),
      ).toBe(packagedFlavor);
    },
  );

  it("keeps legacy packaged Stable independent from a source shell's flavor", () => {
    expect(
      resolveTrellisDesktopRuntimeFlavor({
        isPackaged: true,
        isDevelopment: false,
        requestedFlavor: "cua",
      }),
    ).toBe("production");
  });

  it("preserves source launcher routing, including its bundled macOS bootstrap", () => {
    expect(
      resolveTrellisDesktopRuntimeFlavor({
        isPackaged: true,
        isDevelopment: false,
        requestedFlavor: "development",
        allowDevelopmentOverride: true,
      }),
    ).toBe("development");
    expect(
      resolveTrellisDesktopRuntimeFlavor({
        isPackaged: false,
        isDevelopment: true,
        requestedFlavor: "canary",
      }),
    ).toBe("canary");
  });

  it.each(["development", "CUA", null])(
    "rejects malformed packaged identity %j before opening any profile",
    (packagedFlavor) => {
      expect(() =>
        resolveTrellisDesktopRuntimeFlavor({
          isPackaged: true,
          isDevelopment: false,
          packagedFlavor,
        }),
      ).toThrow("packaged Trellis desktop flavor is invalid");
    },
  );

  it("isolates smoke profiles only for source launches or isolated packages", () => {
    expect(canOverrideDesktopSmokeUserData({ packagedFlavor: "cua" })).toBe(true);
    expect(canOverrideDesktopSmokeUserData({ packagedFlavor: "beta" })).toBe(true);
    expect(
      canOverrideDesktopSmokeUserData({
        sourceBuildMarker: TRELLIS_SOURCE_DESKTOP_BUILD_MARKER,
      }),
    ).toBe(true);
    for (const packagedFlavor of ["production", "canary", "development", null]) {
      expect(
        canOverrideDesktopSmokeUserData({
          packagedFlavor,
          sourceBuildMarker: TRELLIS_SOURCE_DESKTOP_BUILD_MARKER,
        }),
      ).toBe(false);
    }
    expect(canOverrideDesktopSmokeUserData({})).toBe(false);
  });
});
