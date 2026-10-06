import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_SERVER_STATUS_URL,
  fetchTrellisServerStatus,
  formatTrellisServerStatus,
} from "./serverStatusCli.ts";

describe("server status CLI probe", () => {
  it("reports a ready server from the unauthenticated health endpoint", async () => {
    const fetch = vi.fn(async (input: string | URL | Request) => {
      expect(String(input)).toBe("http://127.0.0.1:3773/health");
      return Response.json({
        status: "ok",
        startupReady: true,
        projection: { state: "healthy", inFlight: false },
      });
    });

    const result = await fetchTrellisServerStatus({ fetch });

    expect(result).toMatchObject({
      reachable: true,
      ready: true,
      url: DEFAULT_SERVER_STATUS_URL,
      health: {
        startupReady: true,
        projection: { state: "healthy" },
      },
    });
    expect(formatTrellisServerStatus(result)).toBe(
      "Trellis server: ready\nURL: http://127.0.0.1:3773\nProjection: healthy",
    );
  });

  it("reports a reachable server that is still starting", async () => {
    const result = await fetchTrellisServerStatus({
      fetch: async () =>
        Response.json({
          status: "ok",
          startupReady: false,
          projection: { state: "degraded" },
        }),
    });

    expect(result).toMatchObject({ reachable: true, ready: false });
    expect(formatTrellisServerStatus(result)).toContain("Trellis server: starting");
  });

  it("distinguishes an unhealthy projection from a server that is still starting", async () => {
    const result = await fetchTrellisServerStatus({
      fetch: async () =>
        Response.json({
          status: "ok",
          startupReady: true,
          projection: { state: "degraded" },
        }),
    });

    expect(result).toMatchObject({ reachable: true, ready: false });
    expect(formatTrellisServerStatus(result)).toContain("Trellis server: not ready");
  });

  it("treats an unknown or missing projection health state as not ready", async () => {
    for (const projection of [{ state: "unknown" }, undefined]) {
      const result = await fetchTrellisServerStatus({
        fetch: async () =>
          Response.json({
            status: "ok",
            startupReady: true,
            ...(projection ? { projection } : {}),
          }),
      });

      expect(result).toMatchObject({ reachable: true, ready: false });
    }
  });

  it("normalizes an explicit server base URL to /health", async () => {
    const fetch = vi.fn(async () =>
      Response.json({ status: "ok", startupReady: true, projection: { state: "healthy" } }),
    );

    await fetchTrellisServerStatus({
      url: "https://trellis.example.com/some/path?ignored=1#hash",
      fetch,
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://trellis.example.com/health",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });

  it("rejects credentials and never reports URL secrets", async () => {
    const result = await fetchTrellisServerStatus({
      url: "https://user:password@trellis.example.com/path?token=secret#fragment",
    });

    expect(result).toEqual({
      reachable: false,
      ready: false,
      url: "https://trellis.example.com",
      error: "Server URL must not contain credentials.",
    });
    expect(JSON.stringify(result)).not.toContain("password");
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("fails closed for invalid URLs and malformed health responses", async () => {
    await expect(fetchTrellisServerStatus({ url: "file:///tmp/trellis" })).resolves.toMatchObject({
      reachable: false,
      ready: false,
      error: "Server URL must use http:// or https://.",
    });

    await expect(
      fetchTrellisServerStatus({ fetch: async () => Response.json({ status: "ok" }) }),
    ).resolves.toMatchObject({
      reachable: false,
      ready: false,
      error: "Health response did not match the Trellis health shape.",
    });
  });

  it("reports HTTP and transport failures without throwing", async () => {
    await expect(
      fetchTrellisServerStatus({
        fetch: async () => new Response("offline", { status: 503 }),
      }),
    ).resolves.toMatchObject({
      reachable: false,
      ready: false,
      error: "Health request returned HTTP 503.",
    });

    const result = await fetchTrellisServerStatus({
      fetch: async () => {
        throw new Error("connection refused");
      },
    });
    expect(result).toMatchObject({
      reachable: false,
      ready: false,
      error: "connection refused",
    });
    expect(formatTrellisServerStatus(result)).toContain("Trellis server: unreachable");
  });
});
