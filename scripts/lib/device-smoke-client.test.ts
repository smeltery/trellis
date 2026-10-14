import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HelperClient, waitForAccessibility } from "./device-smoke-client";

function setup() {
  const process = Object.assign(new EventEmitter(), {
    stdin: new PassThrough(),
    stdout: new PassThrough(),
    stderr: new PassThrough(),
  });
  const client = new HelperClient(process as unknown as ChildProcessWithoutNullStreams);
  return { client, process };
}

afterEach(() => vi.useRealTimers());

describe("device smoke helper startup", () => {
  it("allows cold enumeration before starting the attach RPC deadline", async () => {
    vi.useFakeTimers();
    const { client, process } = setup();
    const ready = client.waitUntilReady();
    await vi.advanceTimersByTimeAsync(55_000);
    process.stdout.write('{"method":"ready"}\n');
    await ready;
    const attached = client.call("attach", { udid: "test" });
    await vi.advanceTimersByTimeAsync(40_000);
    process.stdout.write('{"id":1,"result":{"udid":"test"}}\n');
    await expect(attached).resolves.toEqual({ udid: "test" });
  });

  it("fails when startup never signals ready", async () => {
    vi.useFakeTimers();
    const { client } = setup();
    const result = expect(client.waitUntilReady()).rejects.toThrow("startup' timed out");
    await vi.advanceTimersByTimeAsync(120_000);
    await result;
  });

  it("rejects startup if the helper exits", async () => {
    const { client, process } = setup();
    const result = expect(client.waitUntilReady()).rejects.toThrow("helper exited early");
    process.emit("exit", 2, null);
    await result;
  });
});

describe("device smoke accessibility readiness", () => {
  const notReady = new Error(
    "accessibility tree unavailable: no frontmost application (SpringBoard may still be starting)",
  );

  it("waits for a transient SpringBoard startup response", async () => {
    vi.useFakeTimers();
    const tree = { tree: { role: "Application", children: [{}] } };
    const call = vi.fn().mockRejectedValueOnce(notReady).mockResolvedValue(tree);
    const result = waitForAccessibility({ call });
    await vi.advanceTimersByTimeAsync(1000);
    await expect(result).resolves.toEqual(tree);
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("still fails if accessibility never becomes ready", async () => {
    vi.useFakeTimers();
    const call = vi.fn().mockRejectedValue(notReady);
    const result = expect(waitForAccessibility({ call }, 3000)).rejects.toThrow(notReady);
    await vi.advanceTimersByTimeAsync(3000);
    await result;
    expect(call).toHaveBeenCalledTimes(4);
  });

  it("does not retry RPC timeouts or unrelated accessibility errors", async () => {
    const error = new Error("helper method 'describe-ui' timed out");
    const call = vi.fn().mockRejectedValue(error);
    await expect(waitForAccessibility({ call })).rejects.toThrow(error);
    expect(call).toHaveBeenCalledTimes(1);
  });
});
