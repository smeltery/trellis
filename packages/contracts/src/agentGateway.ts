/**
 * Public contracts for the Trellis agent-control gateway.
 *
 * New gateway tools decode these schemas before doing any work. Keeping the
 * limits here ensures the MCP surface, server implementation, and tests share
 * the same definition of an exact creation/wait plan.
 */
import { Schema } from "effect";

import { ProjectId, ThreadId, TurnId } from "./baseSchemas";
import { ModelSelection, ProviderKind } from "./orchestration";
import { ProviderModelDescriptor } from "./providerDiscovery";
import { ServerProviderAuthStatus } from "./server";

export const TRELLIS_GATEWAY_MAX_THREADS_PER_OPERATION = 20;
export const TRELLIS_GATEWAY_MAX_REQUEST_ID_LENGTH = 256;
export const TRELLIS_GATEWAY_MAX_WAIT_MS = 60_000;

export const TrellisGatewayErrorCode = Schema.Literals([
  "caller_session_inactive",
  "caller_turn_inactive",
  "capability_denied",
  "provider_unavailable",
  "model_unavailable",
  "model_option_unavailable",
  "idempotency_conflict",
  "creation_plan_locked",
  "creation_limit_exceeded",
  "thread_not_found",
  "wait_timed_out",
  "operation_failed",
]);
export type TrellisGatewayErrorCode = typeof TrellisGatewayErrorCode.Type;

export const TrellisGatewayError = Schema.Struct({
  code: TrellisGatewayErrorCode,
  message: Schema.String,
  details: Schema.optional(Schema.Unknown),
});
export type TrellisGatewayError = typeof TrellisGatewayError.Type;

export const TrellisGatewayErrorResult = Schema.Struct({
  error: TrellisGatewayError,
});
export type TrellisGatewayErrorResult = typeof TrellisGatewayErrorResult.Type;

export const TrellisContextResult = Schema.Struct({
  harness: Schema.Struct({
    name: Schema.Literal("Trellis"),
    policyVersion: Schema.String,
  }),
  caller: Schema.Struct({
    threadId: ThreadId,
    turnId: Schema.NullOr(TurnId),
    provider: ProviderKind,
    projectId: ProjectId,
  }),
  capabilities: Schema.Struct({
    threadRead: Schema.Boolean,
    threadCreate: Schema.Boolean,
    threadWait: Schema.Boolean,
    automations: Schema.Boolean,
  }),
});
export type TrellisContextResult = typeof TrellisContextResult.Type;

export const TrellisCreateThreadSpec = Schema.Struct({
  prompt: Schema.String.check(Schema.isNonEmpty()),
  contextMessageIds: Schema.optional(
    Schema.Array(Schema.String.check(Schema.isNonEmpty())).check(Schema.isMaxLength(16)),
  ),
  notifyCreatorOnComplete: Schema.optional(Schema.Boolean),
  title: Schema.optional(Schema.String.check(Schema.isNonEmpty())),
  target: ModelSelection,
  projectId: Schema.optional(ProjectId),
  environment: Schema.optional(Schema.Literals(["local", "worktree"])),
  baseRef: Schema.optional(Schema.String.check(Schema.isNonEmpty())),
  // Legacy inputs remain decodable for replay/backward compatibility, but the
  // MCP catalog no longer advertises branch-backed worktree creation.
  baseBranch: Schema.optional(Schema.String.check(Schema.isNonEmpty())),
  branchName: Schema.optional(Schema.String.check(Schema.isNonEmpty())),
  runtimeMode: Schema.optional(Schema.Literals(["approval-required", "full-access"])),
  // External integrations need the "computer:control" scope; provider sessions
  // cannot delegate computer control to created threads.
  enableComputerControl: Schema.optional(Schema.Boolean),
});
export type TrellisCreateThreadSpec = typeof TrellisCreateThreadSpec.Type;

const TrellisGatewayRequestId = Schema.String.check(Schema.isNonEmpty()).check(
  Schema.isMaxLength(TRELLIS_GATEWAY_MAX_REQUEST_ID_LENGTH),
);

export const TrellisCreateThreadsInput = Schema.Struct({
  requestId: TrellisGatewayRequestId,
  threads: Schema.Array(TrellisCreateThreadSpec)
    .check(Schema.isMinLength(1))
    .check(Schema.isMaxLength(TRELLIS_GATEWAY_MAX_THREADS_PER_OPERATION)),
}).annotate({ parseOptions: { onExcessProperty: "error" } });
export type TrellisCreateThreadsInput = typeof TrellisCreateThreadsInput.Type;

export const TrellisProviderCatalog = Schema.Struct({
  provider: ProviderKind,
  defaultModel: Schema.NullOr(Schema.String),
  models: Schema.Array(ProviderModelDescriptor),
  enabled: Schema.Boolean,
  available: Schema.Boolean,
  authStatus: Schema.optional(ServerProviderAuthStatus),
  source: Schema.optional(Schema.String),
  error: Schema.optional(Schema.String),
});
export type TrellisProviderCatalog = typeof TrellisProviderCatalog.Type;

export const TrellisGatewayTargetOptionValue = Schema.Union([
  Schema.String,
  Schema.Number,
  Schema.Boolean,
]);
export type TrellisGatewayTargetOptionValue = typeof TrellisGatewayTargetOptionValue.Type;

export const TrellisGatewayTargetOptionRule = Schema.Struct({
  key: Schema.String,
  valueType: Schema.Literals(["string", "number", "boolean"]),
  allowedValues: Schema.Array(TrellisGatewayTargetOptionValue),
  allowedValuesSource: Schema.Literals(["provider-contract", "model-discovery"]),
});
export type TrellisGatewayTargetOptionRule = typeof TrellisGatewayTargetOptionRule.Type;

export const TrellisGatewayTargetConstruction = Schema.Struct({
  modelValueSource: Schema.Literal("providers[].models[].slug"),
  primaryOptionKey: Schema.String,
  alternativeOptionKeys: Schema.Array(Schema.String),
  optionSelectionRule: Schema.String,
  providerOptions: Schema.Array(TrellisGatewayTargetOptionRule),
  optionsByModel: Schema.Record(Schema.String, Schema.Array(TrellisGatewayTargetOptionRule)),
  exampleTarget: Schema.NullOr(ModelSelection),
});
export type TrellisGatewayTargetConstruction = typeof TrellisGatewayTargetConstruction.Type;

export const TrellisCapabilitiesResult = Schema.Struct({
  targetConstruction: Schema.Record(Schema.String, TrellisGatewayTargetConstruction),
  providers: Schema.Array(TrellisProviderCatalog),
  limits: Schema.Struct({
    maxThreadsPerOperation: Schema.Int,
    maxWaitMs: Schema.Int,
    oneCreationPlanPerActiveTurn: Schema.Boolean,
  }),
});
export type TrellisCapabilitiesResult = typeof TrellisCapabilitiesResult.Type;

export const TrellisCreatedThreadResult = Schema.Struct({
  index: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  threadId: ThreadId,
  projectId: ProjectId,
  title: Schema.String,
  target: ModelSelection,
  provider: ProviderKind,
  model: Schema.String,
  runtimeMode: Schema.Literals(["approval-required", "full-access"]),
  environment: Schema.Literals(["local", "worktree"]),
  branch: Schema.NullOr(Schema.String),
  worktreePath: Schema.NullOr(Schema.String),
  /** Ready-to-use markdown link target for the created thread
   * (`thread://<threadId>`) — renders as a clickable thread link. */
  link: Schema.optional(Schema.String),
  status: Schema.Literal("task_dispatched"),
});
export type TrellisCreatedThreadResult = typeof TrellisCreatedThreadResult.Type;

export const TrellisCreateThreadsResult = Schema.Struct({
  operationId: Schema.String,
  requestId: TrellisGatewayRequestId,
  requestedCount: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  createdCount: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  threadIds: Schema.Array(ThreadId),
  threads: Schema.Array(TrellisCreatedThreadResult),
});
export type TrellisCreateThreadsResult = typeof TrellisCreateThreadsResult.Type;

export const TrellisWaitForThreadsInput = Schema.Struct({
  threadIds: Schema.Array(ThreadId)
    .check(Schema.isMinLength(1))
    .check(Schema.isMaxLength(TRELLIS_GATEWAY_MAX_THREADS_PER_OPERATION)),
  runIds: Schema.optional(
    Schema.Array(Schema.NullOr(TurnId)).check(
      Schema.isMaxLength(TRELLIS_GATEWAY_MAX_THREADS_PER_OPERATION),
    ),
  ),
  timeoutMs: Schema.optional(
    Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)).check(
      Schema.isLessThanOrEqualTo(TRELLIS_GATEWAY_MAX_WAIT_MS),
    ),
  ),
}).annotate({ parseOptions: { onExcessProperty: "error" } });
export type TrellisWaitForThreadsInput = typeof TrellisWaitForThreadsInput.Type;

export const TrellisWaitedThreadResult = Schema.Struct({
  threadId: ThreadId,
  runId: Schema.NullOr(TurnId),
  state: Schema.Literals(["idle", "pending", "running", "completed", "error", "interrupted"]),
  terminal: Schema.Boolean,
  timedOut: Schema.Boolean,
  summary: Schema.NullOr(Schema.String),
  summaryTruncated: Schema.Boolean,
  error: Schema.NullOr(Schema.String),
  readThread: Schema.Struct({
    tool: Schema.Literal("trellis_read_thread"),
    arguments: Schema.Struct({ threadId: ThreadId }),
  }),
});
export type TrellisWaitedThreadResult = typeof TrellisWaitedThreadResult.Type;

export const TrellisWaitForThreadsResult = Schema.Struct({
  callerThreadId: ThreadId,
  runIds: Schema.Array(Schema.NullOr(TurnId)),
  allTerminal: Schema.Boolean,
  timedOut: Schema.Boolean,
  threads: Schema.Array(TrellisWaitedThreadResult),
});
export type TrellisWaitForThreadsResult = typeof TrellisWaitForThreadsResult.Type;
