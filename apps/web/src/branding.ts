export const APP_BASE_NAME = "Trellis";
const isCanaryDesktop =
  typeof window !== "undefined" && window.location?.protocol === "trellis-canary:";
const isBetaDesktop =
  typeof window !== "undefined" && window.location?.protocol === "trellis-beta:";
export const APP_DISPLAY_NAME = isCanaryDesktop
  ? "Trellis Canary"
  : isBetaDesktop
    ? "Trellis Beta"
    : import.meta.env.DEV
      ? `${APP_BASE_NAME} (Dev)`
      : APP_BASE_NAME;
export const APP_VERSION = import.meta.env.APP_VERSION || "0.0.0";
