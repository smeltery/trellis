import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resolveWsHttpUrl } from "./wsHttpUrl";

describe("resolveWsHttpUrl", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_WS_URL", "");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("forwards the websocket token to relative server routes", () => {
    vi.stubGlobal("window", {
      desktopBridge: {
        getWsUrl: () => "ws://127.0.0.1:4111/ws?token=legacy-secret",
      },
      location: { origin: "http://fallback.test" },
    });

    expect(resolveWsHttpUrl("/api/attachment", { requireBackend: true })).toBe(
      "http://127.0.0.1:4111/api/attachment?token=legacy-secret",
    );
  });

  it("does not forward the websocket token to an absolute external URL", () => {
    vi.stubGlobal("window", {
      desktopBridge: {
        getWsUrl: () => "wss://trellis.test/ws?token=legacy-secret",
      },
      location: { origin: "https://fallback.test" },
    });

    expect(resolveWsHttpUrl("https://example.test/image.png")).toBe(
      "https://example.test/image.png",
    );
  });

  it.each([null, "not-a-url", "file:///tmp/backend", "trellis-remote://app"])(
    "refuses mutations without a network desktop backend (%s), without breaking GET rendering",
    (backend) => {
      vi.stubGlobal("window", {
        desktopBridge: { getWsUrl: () => backend },
        location: { origin: "trellis-remote://app" },
      });

      expect(() => resolveWsHttpUrl("/api/attachments/upload", { requireBackend: true })).toThrow(
        "The desktop connection is unavailable. Reconnect and try again.",
      );
      expect(resolveWsHttpUrl("/api/project-favicon")).toBe(
        "trellis-remote://app/api/project-favicon",
      );
    },
  );

  it("keeps same-origin browser mutations working without a WebSocket override", () => {
    vi.stubGlobal("window", { location: { origin: "https://trellis.test" } });

    expect(resolveWsHttpUrl("/api/attachments/upload", { requireBackend: true })).toBe(
      "https://trellis.test/api/attachments/upload",
    );
  });

  it("keeps explicit external network URLs independent of a missing desktop backend", () => {
    vi.stubGlobal("window", {
      desktopBridge: { getWsUrl: () => null },
      location: { origin: "trellis-remote://app" },
    });

    expect(resolveWsHttpUrl("https://example.test/image.png", { requireBackend: true })).toBe(
      "https://example.test/image.png",
    );
  });
});
