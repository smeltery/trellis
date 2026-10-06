// FILE: desktopIdentity.ts
// Purpose: Defines the canonical desktop application identity across packaging and runtime.

export const TRELLIS_DESKTOP_SCHEME = "trellis";
export const TRELLIS_DESKTOP_ORIGIN = `${TRELLIS_DESKTOP_SCHEME}://app`;
export const TRELLIS_DESKTOP_ENTRY_URL = `${TRELLIS_DESKTOP_ORIGIN}/index.html`;
export const TRELLIS_DESKTOP_UPDATE_CHANNEL = "trellis";
export const TRELLIS_PRODUCTION_BUNDLE_ID = "com.smeltery.trellis";
export const TRELLIS_DEVELOPMENT_BUNDLE_ID = `${TRELLIS_PRODUCTION_BUNDLE_ID}.dev`;
export const TRELLIS_CANARY_BUNDLE_ID = `${TRELLIS_PRODUCTION_BUNDLE_ID}.canary`;
/** Display/setup identity of the GUI host; this value does not confer native authority. */
export const TRELLIS_DESKTOP_BUNDLE_ID_ENV = "TRELLIS_DESKTOP_BUNDLE_ID";
export const TRELLIS_CANARY_DESKTOP_SCHEME = "trellis-canary";
export const TRELLIS_CANARY_DESKTOP_ORIGIN = `${TRELLIS_CANARY_DESKTOP_SCHEME}://app`;
export const TRELLIS_CANARY_DESKTOP_ENTRY_URL = `${TRELLIS_CANARY_DESKTOP_ORIGIN}/index.html`;
export const TRELLIS_CUA_BUNDLE_ID = `${TRELLIS_PRODUCTION_BUNDLE_ID}.cua`;
export const TRELLIS_CUA_DESKTOP_SCHEME = "trellis-cua";
export const TRELLIS_CUA_DESKTOP_ORIGIN = `${TRELLIS_CUA_DESKTOP_SCHEME}://app`;
export const TRELLIS_CUA_DESKTOP_ENTRY_URL = `${TRELLIS_CUA_DESKTOP_ORIGIN}/index.html`;
export const TRELLIS_BETA_BUNDLE_ID = `${TRELLIS_PRODUCTION_BUNDLE_ID}.beta`;
export const TRELLIS_BETA_DESKTOP_SCHEME = "trellis-beta";
export const TRELLIS_BETA_DESKTOP_ORIGIN = `${TRELLIS_BETA_DESKTOP_SCHEME}://app`;
export const TRELLIS_BETA_DESKTOP_ENTRY_URL = `${TRELLIS_BETA_DESKTOP_ORIGIN}/index.html`;
export const TRELLIS_SOURCE_DESKTOP_BUILD_MARKER = "trellis-source-desktop-build-v2";
export const TRELLIS_DESKTOP_SMOKE_USER_DATA_ENV = "TRELLIS_DESKTOP_SMOKE_USER_DATA";

export type TrellisDesktopFlavor = "production" | "development" | "canary" | "cua" | "beta";
export const TRELLIS_PACKAGED_DESKTOP_FLAVORS = ["production", "canary", "cua", "beta"] as const;
export type TrellisPackagedDesktopFlavor = (typeof TRELLIS_PACKAGED_DESKTOP_FLAVORS)[number];

/**
 * electron-updater matches the update channel against the release tag's
 * prerelease identifier, so the beta flavor must use the `beta` channel to see
 * `vX.Y.Z-beta.N` releases. Every other flavor keeps the `trellis` channel.
 */
export function desktopUpdateChannel(flavor: TrellisDesktopFlavor): string {
  return flavor === "beta" ? "beta" : TRELLIS_DESKTOP_UPDATE_CHANNEL;
}

export interface TrellisDesktopIdentity {
  readonly flavor: TrellisDesktopFlavor;
  readonly displayName: string;
  readonly bundleId: string;
  readonly scheme: string;
  readonly origin: string;
  readonly entryUrl: string;
  readonly userDataDirectoryName: string;
  readonly defaultHomeDirectoryName: string;
  readonly usesScriptedUpdates: boolean;
}

export function resolveTrellisDesktopFlavor(input: {
  readonly isDevelopment: boolean;
  readonly requestedFlavor?: string | undefined;
  readonly allowDevelopmentOverride?: boolean | undefined;
}): TrellisDesktopFlavor {
  const requestedFlavor = input.requestedFlavor?.trim().toLowerCase();
  if (requestedFlavor === "cua") {
    return "cua";
  }
  if (requestedFlavor === "canary") {
    return "canary";
  }
  if (requestedFlavor === "beta") {
    return "beta";
  }
  if (
    requestedFlavor === "development" &&
    (input.isDevelopment || input.allowDevelopmentOverride === true)
  ) {
    return "development";
  }
  return input.isDevelopment ? "development" : "production";
}

/** Packaged identity is fixed when the artifact is staged, before it is signed. */
export function resolveTrellisDesktopRuntimeFlavor(input: {
  readonly isPackaged: boolean;
  readonly isDevelopment: boolean;
  readonly packagedFlavor?: unknown;
  readonly requestedFlavor?: string | undefined;
  readonly allowDevelopmentOverride?: boolean | undefined;
}): TrellisDesktopFlavor {
  if (input.isPackaged && input.packagedFlavor !== undefined) {
    const flavor = input.packagedFlavor;
    if (flavor === "production" || flavor === "canary" || flavor === "cua" || flavor === "beta") {
      return flavor;
    }
    throw new Error("The packaged Trellis desktop flavor is invalid. Rebuild the application.");
  }
  // Source launchers also use an app bundle on macOS. Their build marker keeps
  // the existing environment-based routing, while legacy packaged apps remain
  // Stable even when a developer shell happens to export a different flavor.
  if (input.isPackaged && input.allowDevelopmentOverride !== true) {
    return "production";
  }
  return resolveTrellisDesktopFlavor(input);
}

export function canOverrideDesktopSmokeUserData(input: {
  readonly packagedFlavor?: unknown;
  readonly sourceBuildMarker?: string | undefined;
}): boolean {
  return (
    input.packagedFlavor === "cua" ||
    input.packagedFlavor === "beta" ||
    (input.packagedFlavor === undefined &&
      input.sourceBuildMarker === TRELLIS_SOURCE_DESKTOP_BUILD_MARKER)
  );
}

export function trellisDesktopIdentity(flavor: TrellisDesktopFlavor): TrellisDesktopIdentity {
  if (flavor === "cua") {
    return {
      flavor,
      displayName: "Trellis Cua",
      bundleId: TRELLIS_CUA_BUNDLE_ID,
      scheme: TRELLIS_CUA_DESKTOP_SCHEME,
      origin: TRELLIS_CUA_DESKTOP_ORIGIN,
      entryUrl: TRELLIS_CUA_DESKTOP_ENTRY_URL,
      userDataDirectoryName: "trellis-cua",
      defaultHomeDirectoryName: ".trellis-cua",
      usesScriptedUpdates: true,
    };
  }
  if (flavor === "canary") {
    return {
      flavor,
      displayName: "Trellis Canary",
      bundleId: TRELLIS_CANARY_BUNDLE_ID,
      scheme: TRELLIS_CANARY_DESKTOP_SCHEME,
      origin: TRELLIS_CANARY_DESKTOP_ORIGIN,
      entryUrl: TRELLIS_CANARY_DESKTOP_ENTRY_URL,
      userDataDirectoryName: "trellis-canary",
      defaultHomeDirectoryName: ".trellis-canary",
      usesScriptedUpdates: true,
    };
  }
  if (flavor === "beta") {
    return {
      flavor,
      displayName: "Trellis Beta",
      bundleId: TRELLIS_BETA_BUNDLE_ID,
      scheme: TRELLIS_BETA_DESKTOP_SCHEME,
      origin: TRELLIS_BETA_DESKTOP_ORIGIN,
      entryUrl: TRELLIS_BETA_DESKTOP_ENTRY_URL,
      userDataDirectoryName: "trellis-beta",
      defaultHomeDirectoryName: ".trellis-beta",
      usesScriptedUpdates: false,
    };
  }
  if (flavor === "development") {
    return {
      flavor,
      displayName: "Trellis (Dev)",
      bundleId: TRELLIS_DEVELOPMENT_BUNDLE_ID,
      scheme: TRELLIS_DESKTOP_SCHEME,
      origin: TRELLIS_DESKTOP_ORIGIN,
      entryUrl: TRELLIS_DESKTOP_ENTRY_URL,
      userDataDirectoryName: "trellis-dev",
      defaultHomeDirectoryName: ".trellis-dev",
      usesScriptedUpdates: false,
    };
  }
  return {
    flavor,
    displayName: "Trellis",
    bundleId: TRELLIS_PRODUCTION_BUNDLE_ID,
    scheme: TRELLIS_DESKTOP_SCHEME,
    origin: TRELLIS_DESKTOP_ORIGIN,
    entryUrl: TRELLIS_DESKTOP_ENTRY_URL,
    userDataDirectoryName: "trellis",
    defaultHomeDirectoryName: ".trellis",
    usesScriptedUpdates: false,
  };
}
