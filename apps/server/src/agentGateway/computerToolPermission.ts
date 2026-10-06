import {
  BROWSER_TOOL_NAMES,
  type ProviderInteractionMode,
  type RuntimeMode,
} from "@trellis/contracts";

/** Exact tool names owned by Trellis's capability-gated Computer gateway. */
export const TRELLIS_COMPUTER_TOOL_NAMES = [
  "computer_activate_window",
  "computer_click",
  "computer_drag",
  "computer_get_accessibility_tree",
  "computer_get_cursor_position",
  "computer_get_screen_size",
  "computer_get_state",
  "computer_help",
  "computer_inspect",
  "computer_spaces",
  "computer_invoke_menu",
  "computer_kill_app",
  "computer_launch_app",
  "computer_list_apps",
  "computer_list_windows",
  "computer_move_cursor",
  "computer_paste",
  "computer_perform_action",
  "computer_press_key",
  "computer_read_clipboard",
  "computer_run",
  "computer_screenshot",
  "computer_scroll",
  "computer_select_text",
  "computer_set_app_visibility",
  "computer_set_value",
  "computer_set_window_frame",
  "computer_set_window_minimized",
  "computer_type_text",
  "computer_verify_state",
  "computer_wait",
  "computer_write_clipboard",
  "computer_zoom",
  // The cua-driver CDP browser family. Deliberately inside the Computer
  // namespace: these are the same capability (computer:control), the same
  // approval gate, and the same denial-card path as the desktop tools — they
  // merely dispatch over CDP rather than OS events. They must never collide
  // with the integrated `browser_*` surface, which is a different host.
  "computer_browser_state",
  "computer_browser_prepare",
  "computer_browser_navigate",
  "computer_browser_click",
  "computer_browser_type",
  "computer_browser_dialog",
  "computer_browser_upload",
  "computer_browser_download",
  "computer_browser_pointer",
  "computer_browser_press",
] as const;

export type TrellisComputerToolName = (typeof TRELLIS_COMPUTER_TOOL_NAMES)[number];

const TRELLIS_COMPUTER_TOOL_NAME_SET = new Set<string>(TRELLIS_COMPUTER_TOOL_NAMES);

function recordString(value: unknown, key: string): string | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = Reflect.get(value, key);
  return typeof candidate === "string" ? candidate : undefined;
}

/**
 * Accept only the canonical gateway name or the exact provider qualifications
 * used for Trellis's reserved MCP server. A similarly named tool from another
 * MCP server must continue through the provider's ordinary permission policy.
 */
export function canonicalTrellisComputerToolName(
  value: unknown,
): TrellisComputerToolName | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  const canonical = normalized.startsWith("mcp__trellis__")
    ? normalized.slice("mcp__trellis__".length)
    : normalized.startsWith("trellis_")
      ? normalized.slice("trellis_".length)
      : normalized;
  return TRELLIS_COMPUTER_TOOL_NAME_SET.has(canonical)
    ? (canonical as TrellisComputerToolName)
    : undefined;
}

/**
 * Provider callbacks must carry Trellis's namespace themselves. Bare canonical
 * names are safe only after a separate protocol field has proved the server
 * identity (for example Codex's `serverName`).
 */
export function qualifiedTrellisComputerToolName(
  value: unknown,
): TrellisComputerToolName | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized.startsWith("mcp__trellis__") && !normalized.startsWith("trellis_")) {
    return undefined;
  }
  return canonicalTrellisComputerToolName(normalized);
}

/**
 * Namespace-insensitive matcher for Computer calls at the gateway boundary.
 *
 * A session that was never granted computer control must still surface the
 * denial card path when the model reaches for a Computer tool, or the attempt
 * dies as a silent tool error and the user never learns control is off.
 *
 * Gateway transport (all MCP providers): `makeAgentGatewayMcpTransport`
 * (`apps/server/src/agentGateway/mcpTransport.ts`) denies an unknown tool
 * name with `capability_denied` plus the denial hook only when
 * `isComputerToolName` matches. Wired in
 * `apps/server/src/agentGateway/Layers/AgentGateway.ts` as the catalog
 * membership test OR this family matcher, so a prefixed spelling from a
 * session that never saw the catalog —
 * `trellis_computer_click`, `mcp__trellis__computer_click` — still reaches
 * the denial hook and the card.
 *
 * Pi's native projection adds specialist forwarders only when its leased
 * catalog advertises Computer control. Disabled sessions carry no Computer
 * fallback schemas; stale calls reaching this boundary still receive the same
 * capability denial as other MCP clients.
 *
 * Entirely-unknown names (`computer_future_tool`, another server's
 * `mcp__other__computer_click`) must keep their current behavior — unknown
 * tools stay INVALID_PARAMS and foreign tools keep the provider's ordinary
 * permission policy — so this matcher accepts only exact owned names in any
 * of the three spellings, never prose around them.
 */
export function isTrellisComputerToolFamilyName(value: unknown): boolean {
  return canonicalTrellisComputerToolName(value) !== undefined;
}

function firstRecordString(value: unknown, keys: ReadonlyArray<string>): string | undefined {
  for (const key of keys) {
    const candidate = recordString(value, key);
    if (candidate !== undefined) return candidate;
  }
  return undefined;
}

export function computerToolNameFromProviderPermission(input: {
  readonly name?: unknown;
  readonly title?: unknown;
  readonly rawInput?: unknown;
  readonly metadata?: unknown;
}): TrellisComputerToolName | undefined {
  const explicitName = typeof input.name === "string" ? input.name : undefined;
  if (explicitName !== undefined) return qualifiedTrellisComputerToolName(explicitName);

  const rawToolName = firstRecordString(input.rawInput, ["_toolName", "toolName", "tool_name"]);
  if (rawToolName !== undefined) return qualifiedTrellisComputerToolName(rawToolName);

  const metadataToolName = firstRecordString(input.metadata, [
    "_toolName",
    "toolName",
    "tool_name",
  ]);
  if (metadataToolName !== undefined) return qualifiedTrellisComputerToolName(metadataToolName);

  // The display `title` is provider-composed text, not a tool name — a
  // request that only *renders* as a Trellis computer call names no such tool
  // and must keep the ordinary permission path.
  return undefined;
}

/**
 * The `trellis_*` catalog served by Trellis's agent gateway: thread read/write,
 * project agent, automation, diagnostics, and review tools. Kept exact — a
 * look-alike MCP server (`trellis_fs`, `trellis_tools`) must never inherit the
 * auto-approve path the reserved `trellis` server gets.
 */
const TRELLIS_GATEWAY_OWNED_TOOL_NAMES = [
  // Thread read tools (threadReadTools.ts)
  "trellis_context",
  "trellis_capabilities",
  "trellis_list_projects",
  "trellis_list_threads",
  "trellis_read_thread",
  "trellis_wait_for_threads",
  // Kanban tools (kanbanTools.ts)
  "trellis_read_kanban_board",
  "trellis_read_kanban_card",
  "trellis_create_kanban_task",
  "trellis_create_kanban_draft",
  "trellis_move_kanban_card",
  "trellis_update_kanban_card",
  "trellis_set_kanban_goal",
  "trellis_delete_kanban_card",
  // Thread write tools (Layers/AgentGateway.ts)
  "trellis_create_threads",
  "trellis_create_thread",
  "trellis_send_message",
  "trellis_interrupt_thread",
  "trellis_set_thread_title",
  "trellis_set_thread_pull_request",
  "trellis_set_thread_archived",
  "trellis_set_thread_goal",
  // Thread diagnostics (threadDiagnosticTools.ts)
  "trellis_read_thread_activity",
  "trellis_diagnose_thread",
  "trellis_read_thread_events",
  "trellis_read_thread_runtime_events",
  // Automations (automationTools.ts)
  "trellis_create_automation",
  "trellis_list_automations",
  "trellis_view_automation",
  "trellis_update_automation",
  "trellis_update_automation_memory",
  "trellis_cancel_automation",
  "trellis_report_automation_result",
  // Project agent tools (projectAgentTools.ts)
  "trellis_project_context",
  "trellis_project_forget",
  "trellis_project_get_overview",
  "trellis_project_library_add",
  "trellis_project_library_list",
  "trellis_project_link_repository",
  "trellis_project_list_tasks",
  "trellis_project_list_threads",
  "trellis_project_read_document",
  "trellis_project_remember",
  "trellis_project_report_result",
  "trellis_project_write_document",
  // Browser review tool (browserTools.ts)
  "trellis_e2e_review",
  // Capability-gated device tools (deviceTools.ts — not in contracts)
  "device_boot",
  "device_describe_ui",
  "device_install",
  "device_launch",
  "device_list",
  "device_open_url",
  "device_press_button",
  "device_screenshot",
  "device_scroll_to_element",
  "device_swipe",
  "device_tap",
  "device_type",
] as const;

/** Every tool name the agent gateway serves, from the shared catalogs. */
const TRELLIS_GATEWAY_TOOL_NAME_SET: ReadonlySet<string> = new Set<string>([
  ...TRELLIS_GATEWAY_OWNED_TOOL_NAMES,
  ...TRELLIS_COMPUTER_TOOL_NAMES,
  ...BROWSER_TOOL_NAMES,
]);

const TRELLIS_MCP_QUALIFIED_PREFIX = "mcp__trellis__";
const TRELLIS_MCP_SERVER_PREFIX = "trellis_";

/**
 * Any tool Trellis's agent gateway serves under its reserved MCP server name —
 * the whole gateway catalog (thread, project, automation, diagnostics,
 * computer, browser, device). The session token is what authorizes each call
 * server-side, so providers that were granted the gateway may let these names
 * skip their own interactive permission prompt when the start input opts in
 * (`ProviderSessionStartInput.autoApproveTrellisTools`).
 *
 * Providers report MCP calls two ways, and both must pin the server identity:
 * Claude-style `mcp__trellis__<tool>` matches on the exact `mcp__trellis__`
 * prefix (a `trellis_fs` server produces `mcp__trellis_fs__*`, which fails it);
 * `<server>_<tool>` reports like OpenCode's `trellis_computer_click` match only
 * when the name — or the part after the `trellis_` server prefix — is in the
 * served catalog. A bare `trellis_*` catalog name (`trellis_list_threads`) also
 * matches because the name itself carries the namespace; capability families
 * (`computer_*`, `browser_*`, `device_*`) must arrive server-qualified.
 * Everything else keeps the ordinary permission path.
 */
export function isTrellisGatewayToolName(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith(TRELLIS_MCP_QUALIFIED_PREFIX)) {
    // The `mcp__trellis__` prefix pins the server, not the tool — only a real
    // catalog name after the prefix may take the auto-approve path, so a
    // look-alike tool name on the same server cannot ride it.
    return TRELLIS_GATEWAY_TOOL_NAME_SET.has(normalized.slice(TRELLIS_MCP_QUALIFIED_PREFIX.length));
  }
  if (TRELLIS_GATEWAY_TOOL_NAME_SET.has(normalized)) {
    return normalized.startsWith(TRELLIS_MCP_SERVER_PREFIX);
  }
  return (
    normalized.startsWith(TRELLIS_MCP_SERVER_PREFIX) &&
    TRELLIS_GATEWAY_TOOL_NAME_SET.has(normalized.slice(TRELLIS_MCP_SERVER_PREFIX.length))
  );
}

/**
 * Namespace-insensitive matcher across the fields a provider permission
 * prompt may report a tool name through — the direct name, or a tool-name
 * field nested in raw input / metadata the way some adapters deliver MCP
 * calls. The display `title` is deliberately not consulted: it is
 * presentational text the provider composes, so it can look like a gateway
 * name without one ever being called.
 */
export function isTrellisGatewayToolCall(input: {
  readonly name?: unknown;
  // Accepted for call-site shape compatibility but never consulted.
  readonly title?: unknown;
  readonly rawInput?: unknown;
  readonly metadata?: unknown;
}): boolean {
  const explicitName = typeof input.name === "string" ? input.name : undefined;
  if (explicitName !== undefined) return isTrellisGatewayToolName(explicitName);

  const rawToolName = firstRecordString(input.rawInput, ["_toolName", "toolName", "tool_name"]);
  if (rawToolName !== undefined) return isTrellisGatewayToolName(rawToolName);

  const metadataToolName = firstRecordString(input.metadata, [
    "_toolName",
    "toolName",
    "tool_name",
  ]);
  if (metadataToolName !== undefined) return isTrellisGatewayToolName(metadataToolName);

  return false;
}

/**
 * Provider permission prompts are redundant for an active Trellis Computer
 * capability: the gateway performs the authoritative task-scoped approval.
 * Plan mode and requests outside an active turn remain fail-closed.
 */
export function shouldAllowTrellisComputerProviderTool(input: {
  readonly computerControlEnabled: boolean;
  readonly activeTurn: boolean;
  readonly interactionMode: ProviderInteractionMode | undefined;
  readonly runtimeMode: RuntimeMode;
  readonly permission: Parameters<typeof computerToolNameFromProviderPermission>[0];
}): boolean {
  return (
    input.computerControlEnabled &&
    input.activeTurn &&
    input.runtimeMode === "approval-required" &&
    input.interactionMode === "default" &&
    computerToolNameFromProviderPermission(input.permission) !== undefined
  );
}
