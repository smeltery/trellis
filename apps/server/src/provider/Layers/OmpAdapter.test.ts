import { TurnId } from "@trellis/contracts";
import { describe, expect, it } from "vitest";
import { TRELLIS_HARNESS_POLICY_MARKER } from "../../agentGateway/harnessPolicy.ts";

import {
  classifyOmpPromptTurnCompletion,
  isOmpNestedTaskToolCall,
  isRenderableOmpAssistantDelta,
  resolveOmpSessionCwd,
  scopeOmpRuntimeItemIdForTurn,
  scopeOmpToolCallStateForTurn,
  shouldIgnoreOmpInterrupt,
  takeOmpTrellisHarnessPolicyTextPart,
} from "./OmpAdapter.ts";

describe("OMP Trellis harness policy", () => {
  it("delivers private scoped host context once", () => {
    const state: { harnessPolicyDelivered?: boolean } = {};
    expect(takeOmpTrellisHarnessPolicyTextPart(state, true)?.text).toContain(
      TRELLIS_HARNESS_POLICY_MARKER,
    );
    expect(takeOmpTrellisHarnessPolicyTextPart(state, true)).toBeNull();
  });
});

const serverConfig = {
  cwd: "/server/cwd",
  homeDir: "/home/test",
} as Parameters<typeof resolveOmpSessionCwd>[1];

describe("resolveOmpSessionCwd", () => {
  it("prefers an explicit cwd over the active thread session cwd", () => {
    expect(resolveOmpSessionCwd("/explicit", serverConfig, "/thread")).toBe("/explicit");
  });

  it("uses the active thread session cwd before the server fallback", () => {
    expect(resolveOmpSessionCwd(undefined, serverConfig, "/thread")).toBe("/thread");
  });
});

describe("OmpAdapter runtime event scoping", () => {
  it("makes reused ACP assistant segment ids unique per turn", () => {
    const providerItemId = "assistant:omp-session:segment:5";

    expect(scopeOmpRuntimeItemIdForTurn(TurnId.makeUnsafe("turn-a"), providerItemId)).toBe(
      "omp:turn-a:assistant:omp-session:segment:5",
    );
    expect(scopeOmpRuntimeItemIdForTurn(TurnId.makeUnsafe("turn-b"), providerItemId)).toBe(
      "omp:turn-b:assistant:omp-session:segment:5",
    );
  });

  it("preserves the provider tool id while scoping the runtime item id", () => {
    const scoped = scopeOmpToolCallStateForTurn(TurnId.makeUnsafe("turn-a"), {
      toolCallId: "call-1",
      kind: "execute",
      status: "completed",
      title: "Ran command",
      data: {
        toolCallId: "call-1",
      },
    });

    expect(scoped.toolCallId).toBe("omp:turn-a:call-1");
    expect(scoped.data).toMatchObject({
      toolCallId: "call-1",
      providerToolCallId: "call-1",
    });
  });

  it("only treats visible assistant text as renderable OMP content", () => {
    expect(
      isRenderableOmpAssistantDelta({
        streamKind: "assistant_text",
        text: "done",
      }),
    ).toBe(true);
    expect(
      isRenderableOmpAssistantDelta({
        streamKind: "assistant_text",
        text: "   ",
      }),
    ).toBe(false);
  });

  it("recognizes nested Task rows whose child progress is hidden from parent ACP", () => {
    expect(
      isOmpNestedTaskToolCall({
        toolCallId: "task-1",
        title: "Task",
        status: "pending",
        data: { rawInput: { subagent_type: "worker" } },
      }),
    ).toBe(true);
    expect(
      isOmpNestedTaskToolCall({
        toolCallId: "read-1",
        title: "Read",
        status: "pending",
        data: {},
      }),
    ).toBe(false);
  });

  it("ignores a delayed stop when its turn is no longer active", () => {
    const oldTurnId = TurnId.makeUnsafe("turn-a");
    const newTurnId = TurnId.makeUnsafe("turn-b");

    expect(shouldIgnoreOmpInterrupt(oldTurnId, newTurnId)).toBe(true);
    expect(shouldIgnoreOmpInterrupt(oldTurnId, undefined)).toBe(true);
    expect(shouldIgnoreOmpInterrupt(newTurnId, newTurnId)).toBe(false);
    expect(shouldIgnoreOmpInterrupt(undefined, newTurnId)).toBe(false);
  });
});
