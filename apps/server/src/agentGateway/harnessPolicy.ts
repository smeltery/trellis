import type { ProviderKind } from "@trellis/contracts";

import { computerToolInstructions } from "./computerGuidance.ts";

import { AUTOMATION_AUTHORING_GUIDANCE } from "./automationAuthoringGuidance.ts";

/** Canonical, versioned host policy delivered to every supported provider. */
export const TRELLIS_HARNESS_POLICY_VERSION = "2026-10-02.1";
export const TRELLIS_HARNESS_POLICY_MARKER = `[Trellis harness policy ${TRELLIS_HARNESS_POLICY_VERSION}]`;

export interface TrellisHarnessCapabilities {
  readonly gatewayControlAvailable: boolean;
  readonly automationAuthoring?: "tool-descriptions";
  readonly enableComputerControl?: boolean | undefined;
}

/**
 * Render one truthful policy. Providers without a safely thread-scoped MCP
 * connection still receive host identity, but are never told they can mutate
 * Trellis resources.
 */
export function renderTrellisHarnessPolicy(capabilities: TrellisHarnessCapabilities): string {
  const controlPolicy = capabilities.gatewayControlAvailable
    ? [
        "Use the trellis_* tools for Trellis threads, projects, automations, and coordination.",
        "Give a completion report: outcome, checks, limitations. Inspect browser_screenshot({kind:'proof'}); embed artifactPath as ![Result description](/absolute/path.png), also for generated images. No secrets or invented proof; skip open-only proof.",
        "When explicitly asked for E2E/end-to-end tests, call trellis_e2e_review. Do not load it for unrelated work.",
        "For any-language requests involving Trellis's integrated, embedded, or in-app browser, use browser_* autonomously as its canonical, complete control surface; never substitute Chrome, Computer Use, Playwright, OS-automation tools/skills, or change the user's active chat. Detailed rules live in each tool description.",
        "For any-language iOS app or simulator request, call device_* directly and autonomously as the canonical, complete control surface; never use xcrun simctl, AppleScript, Appium, idb, open Simulator.app, or substitute mobile/OS-automation tools/skills, because the user watches the streamed pane. Detailed rules live in each tool description.",
        "For thread discovery and diagnosis, use trellis_list_threads, trellis_read_thread, trellis_read_thread_activity, trellis_read_thread_events, trellis_read_thread_runtime_events, and trellis_diagnose_thread before SQLite or process logs. Use host storage only when tool coverage says required evidence is unavailable.",
        "After successfully creating a pull request for the current thread's own deliverable, call trellis_set_thread_pull_request with its URL. Never associate a pull request that the thread only reviews, references, or discusses.",
        "Provider-native subagent or Task tools are implementation details: they do not create Trellis threads and must not substitute for an explicit request to create Trellis threads.",
        "For a plural thread request, submit one exact trellis_create_threads plan. The array length is the exact requested count.",
        "If trellis_create_threads fails before returning an operationId, correct the rejected plan and reuse its requestId; no durable task was created.",
        "Use trellis_capabilities to select canonical provider, model, and option values. Never guess a model slug or silently substitute a provider or model.",
        "Use trellis_capabilities.targetConstruction: Codex options.reasoningEffort and Claude Agent options.effort are not interchangeable.",
        "For requested results, use trellis_wait_for_threads and wait for all, then synthesize. Hub coordinator packets allow async reports unless results are requested now.",
        "After operationId, retry the same requestId and exact plan. Report failures; no replacement threads without a new user request. Hub retries are server-owned.",
        "Trellis automations support heartbeat, standalone, and dedicated modes plus interval, once, daily, weekdays, weekly, and cron schedules. Existing everyMinutes heartbeat calls remain supported. Use fastInterval: true only when the user explicitly accepts a sub-minute bounded loop.",
        "Mode controls execution: heartbeat appends to an idle target thread; standalone opens a fresh thread per independent run; dedicated reuses one automation-owned thread so runs build on each other without writing into another thread.",
        "Prefer dedicated for ongoing observation or tracking: standalone runs cannot see prior runs beyond memory, while dedicated keeps one growing thread.",
        'Mode does not restrict stop conditions. completionPolicy {"type":"ai-evaluated","stopWhen":"..."} works in both modes and disables the automation when the clause matches a successful run; prefer it over encoding the stop condition in the prompt. maxIterations remains the backstop, and an automation-dispatched run may always call trellis_cancel_automation on its own automation.',
        // Claude discovers these same instructions on create/update tool schemas.
        ...(capabilities.automationAuthoring === "tool-descriptions"
          ? []
          : [AUTOMATION_AUTHORING_GUIDANCE]),
        "Prefer trellis_create_automation with suggested: true when the user has not explicitly asked to create an automation. Suggested automations remain disabled until the user accepts their proposal card.",
        "Before trellis_update_automation, call trellis_view_automation. Resend all mutable fields, including unchanged ones: updates replace, not merge.",
        'Automation-dispatched turns receive an identity/run/memory envelope in the current user message. Only that current turn is automation-dispatched; the status never carries into a later manual follow-up such as "continue", even in the same thread.',
        'During an automation-dispatched turn, persist durable context with trellis_update_automation_memory {"memory": "..."} before finishing; memory is full replacement, DB-backed, and capped at 32 KiB.',
        'Every automation-dispatched turn must finish by calling trellis_report_automation_result. Use decision "silent" only for a successful run with nothing requiring user attention; otherwise use "notify" with a concise title and summary. Failures remain visible regardless of this decision or the automation notification policy. Never call this tool for a manual follow-up turn.',
      ]
    : [
        "Trellis MCP control is unavailable in this provider session. Do not claim that Trellis threads, projects, or automations were created or changed.",
        "Provider-native subagent or Task tools do not create Trellis threads. If the user explicitly requests Trellis resource management, explain that this session cannot perform it.",
      ];

  return [
    TRELLIS_HARNESS_POLICY_MARKER,
    "You are running inside Trellis. Trellis is the host and harness for this session.",
    "For known local files in user-facing Markdown, use readable labels and absolute file URLs, such as [config.ts](file:///absolute/path/config.ts). Relative links are only for the session working directory; otherwise use plain text and never invent a path.",
    'Trellis collapses progress and tools under "Worked for...". Final responses must restate every needed scope, plan, decision, result, caveat, instruction, or question. Never request approval using "this", "the above", or another referent available only in collapsed content.',
    "When a structured user-input tool is available for a genuine decision, prefer it and include all decision context in its question or card.",
    ...controlPolicy,
    ...(capabilities.gatewayControlAvailable && capabilities.enableComputerControl === true
      ? [computerToolInstructions()]
      : []),
  ].join("\n");
}

export const TRELLIS_GATEWAY_HARNESS_POLICY = renderTrellisHarnessPolicy({
  gatewayControlAvailable: true,
});

export interface TrellisHarnessPolicyDeliveryState {
  harnessPolicyDelivered?: boolean | undefined;
  enableComputerControl?: boolean | undefined;
}

const PROVIDERS_WITH_THREAD_SCOPED_TRELLIS_MCP = new Set<ProviderKind>([
  "codex",
  "claudeAgent",
  "antigravity",
  "cursor",
  "grok",
  "droid",
  "devin",
  "opencode",
  "pi",
  "omp",
]);

export function providerHasTrellisGatewayControl(input: {
  readonly provider: ProviderKind;
  readonly scopedGatewayConnectionAvailable: boolean;
}): boolean {
  return (
    input.scopedGatewayConnectionAvailable &&
    PROVIDERS_WITH_THREAD_SCOPED_TRELLIS_MCP.has(input.provider)
  );
}

/** Return the private host-context block exactly once for one provider session. */
export function takeTrellisHarnessPolicyForSession(
  state: TrellisHarnessPolicyDeliveryState,
  capabilities: TrellisHarnessCapabilities,
): string | null {
  if (state.harnessPolicyDelivered === true) return null;
  state.harnessPolicyDelivered = true;
  return [
    "<trellis_host_context>",
    renderTrellisHarnessPolicy(capabilities),
    "</trellis_host_context>",
  ].join("\n");
}

/**
 * Provider-aware delivery guard. The transport flag must only become true
 * after a provider has installed thread-scoped gateway tools successfully.
 */
export function takeTrellisHarnessPolicyForProviderSession(
  state: TrellisHarnessPolicyDeliveryState,
  input: {
    readonly provider: ProviderKind;
    readonly scopedGatewayConnectionAvailable: boolean;
  },
): string | null {
  return takeTrellisHarnessPolicyForSession(state, {
    gatewayControlAvailable: providerHasTrellisGatewayControl(input),
    enableComputerControl: state.enableComputerControl === true,
  });
}

export function takeTrellisHarnessPolicyTextPartForProviderSession(
  state: TrellisHarnessPolicyDeliveryState,
  input: {
    readonly provider: ProviderKind;
    readonly scopedGatewayConnectionAvailable: boolean;
  },
): { readonly type: "text"; readonly text: string } | null {
  const text = takeTrellisHarnessPolicyForProviderSession(state, input);
  return text === null ? null : { type: "text", text };
}
