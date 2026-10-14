import type { ChildProcessWithoutNullStreams } from "node:child_process";

interface PendingRequest {
  readonly resolve: (value: Record<string, unknown>) => void;
  readonly reject: (error: Error) => void;
}

/** A JSON-RPC client over the helper's stdio. */
export class HelperClient {
  private ready = false;
  private readonly pending = new Map<number, PendingRequest>();
  private buffer = "";
  private nextId = 1;
  readonly stderr: string[] = [];

  private readonly child: ChildProcessWithoutNullStreams;

  constructor(child: ChildProcessWithoutNullStreams) {
    this.child = child;
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => this.consume(chunk));
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      for (const line of chunk.split("\n")) {
        if (line.trim()) this.stderr.push(line);
      }
    });
    child.on("exit", (code, signal) => {
      const error = new Error(`helper exited early (code ${code}, signal ${signal})`);
      for (const [, request] of this.pending) request.reject(error);
      this.pending.clear();
    });
  }

  private consume(chunk: string): void {
    this.buffer += chunk;
    let newline = this.buffer.indexOf("\n");
    while (newline >= 0) {
      const line = this.buffer.slice(0, newline);
      this.buffer = this.buffer.slice(newline + 1);
      newline = this.buffer.indexOf("\n");
      if (!line.trim()) continue;
      let message: Record<string, unknown>;
      try {
        message = JSON.parse(line) as Record<string, unknown>;
      } catch {
        continue;
      }
      const id = message["id"];
      if (message["method"] === "ready") {
        this.ready = true;
        this.pending.get(0)?.resolve({});
        this.pending.delete(0);
        continue;
      }
      if (typeof id !== "number") continue; // A notification.
      const request = this.pending.get(id);
      if (!request) continue;
      this.pending.delete(id);
      const error = message["error"] as { message?: string } | undefined;
      if (error) {
        request.reject(new Error(error.message ?? "unknown helper error"));
        return;
      }
      request.resolve((message["result"] ?? {}) as Record<string, unknown>);
    }
  }

  /** CoreSimulator enumeration on a cold runner is separate from RPC latency. */
  waitUntilReady(timeoutMs = 120_000): Promise<void> {
    if (this.ready) return Promise.resolve();
    return this.waitForResponse(0, "startup", timeoutMs).then(() => undefined);
  }

  call(
    method: string,
    params: Record<string, unknown> = {},
    timeoutMs = 45_000,
  ): Promise<Record<string, unknown>> {
    const id = this.nextId++;
    const response = this.waitForResponse(id, method, timeoutMs);
    this.child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    return response;
  }

  private waitForResponse(
    id: number,
    method: string,
    timeoutMs: number,
  ): Promise<Record<string, unknown>> {
    return new Promise((resolvePromise, rejectPromise) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        rejectPromise(new Error(`helper method '${method}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolvePromise(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          rejectPromise(error);
        },
      });
    });
  }
}

/** SpringBoard accessibility can lag behind bootstatus and the first frame. */
export async function waitForAccessibility(
  client: Pick<HelperClient, "call">,
  timeoutMs = 60_000,
): Promise<Record<string, unknown>> {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    try {
      return await client.call(
        "describe-ui",
        { maxDepth: 6 },
        Math.min(45_000, Math.max(1, deadline - Date.now())),
      );
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !error.message.startsWith("accessibility tree unavailable: no frontmost application") ||
        Date.now() >= deadline
      ) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.min(1000, deadline - Date.now())));
    }
  }
}
