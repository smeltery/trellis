import { describe, expect, it } from "vitest";
import {
  canonicalTrellisComputerToolName,
  computerToolNameFromProviderPermission,
  isTrellisComputerToolFamilyName,
  isTrellisGatewayToolCall,
  isTrellisGatewayToolName,
  qualifiedTrellisComputerToolName,
  shouldAllowTrellisComputerProviderTool,
} from "./computerToolPermission.ts";

describe("Trellis Computer provider permission", () => {
  it.each([
    ["computer_click", "computer_click"],
    ["trellis_computer_type_text", "computer_type_text"],
    ["mcp__trellis__computer_read_clipboard", "computer_read_clipboard"],
    ["mcp__trellis__computer_inspect", "computer_inspect"],
  ] as const)("recognizes the exact owned tool %s", (providerName, canonicalName) => {
    expect(canonicalTrellisComputerToolName(providerName)).toBe(canonicalName);
  });

  it.each([
    "computer_future_tool",
    "mcp__other__computer_click",
    "other_computer_click",
    "mcp__trellis__trellis_send_message",
  ])("does not trust another or unknown tool: %s", (providerName) => {
    expect(canonicalTrellisComputerToolName(providerName)).toBeUndefined();
  });

  it("requires a provider namespace when server provenance was not proved separately", () => {
    expect(qualifiedTrellisComputerToolName("computer_click")).toBeUndefined();
    expect(qualifiedTrellisComputerToolName("mcp__trellis__computer_click")).toBe("computer_click");
    expect(qualifiedTrellisComputerToolName("trellis_computer_click")).toBe("computer_click");
  });

  it("reads only explicit provider tool-name fields", () => {
    expect(
      computerToolNameFromProviderPermission({
        rawInput: { _toolName: "mcp__trellis__computer_scroll" },
      }),
    ).toBe("computer_scroll");
    expect(
      computerToolNameFromProviderPermission({
        metadata: { toolName: "trellis_computer_get_state" },
      }),
    ).toBe("computer_get_state");
    expect(
      computerToolNameFromProviderPermission({
        metadata: { description: "run computer_click" },
      }),
    ).toBeUndefined();
  });

  it("does not let lower-priority fields override an authoritative wrong namespace", () => {
    expect(
      computerToolNameFromProviderPermission({
        name: "mcp__other__computer_click",
        rawInput: { _toolName: "mcp__trellis__computer_click" },
      }),
    ).toBeUndefined();
    expect(
      computerToolNameFromProviderPermission({
        rawInput: { _toolName: "mcp__other__computer_click" },
        metadata: { toolName: "mcp__trellis__computer_click" },
        title: "mcp__trellis__computer_click",
      }),
    ).toBeUndefined();
  });

  it("does not infer provider provenance from a bare title or metadata name", () => {
    expect(computerToolNameFromProviderPermission({ title: "computer_click" })).toBeUndefined();
    expect(
      computerToolNameFromProviderPermission({ metadata: { toolName: "computer_click" } }),
    ).toBeUndefined();
  });

  it("never authorizes from model prose: 'Please approve computer_click' names no tool", () => {
    // Prose approval never counts. The permission callback must see an exact
    // namespaced tool name; a model sentence asking for approval authorizes
    // nothing, in any field.
    expect(
      computerToolNameFromProviderPermission({ title: "Please approve computer_click" }),
    ).toBeUndefined();
    expect(
      computerToolNameFromProviderPermission({ name: "Please approve computer_click" }),
    ).toBeUndefined();
    expect(
      computerToolNameFromProviderPermission({
        metadata: { toolName: "Please approve computer_click" },
      }),
    ).toBeUndefined();
    expect(isTrellisComputerToolFamilyName("Please approve computer_click")).toBe(false);
    expect(
      shouldAllowTrellisComputerProviderTool({
        computerControlEnabled: true,
        activeTurn: true,
        interactionMode: "default",
        runtimeMode: "approval-required",
        permission: { title: "Please approve computer_click" },
      }),
    ).toBe(false);
  });

  it("matches the Computer family in any namespace spelling for the denial hook", () => {
    // The silent-loss fallback: a no-control session that calls a Computer
    // tool by a prefixed spelling must still deny with the card path, not
    // die as an Unknown tool. See isTrellisComputerToolFamilyName.
    expect(isTrellisComputerToolFamilyName("computer_click")).toBe(true);
    expect(isTrellisComputerToolFamilyName("trellis_computer_get_state")).toBe(true);
    expect(isTrellisComputerToolFamilyName("mcp__trellis__computer_screenshot")).toBe(true);
    expect(isTrellisComputerToolFamilyName("  MCP__TRELLIS__COMPUTER_WAIT  ")).toBe(true);
  });

  it("keeps unknown and foreign names out of the Computer family", () => {
    expect(isTrellisComputerToolFamilyName("computer_future_tool")).toBe(false);
    expect(isTrellisComputerToolFamilyName("mcp__other__computer_click")).toBe(false);
    expect(isTrellisComputerToolFamilyName("other_computer_click")).toBe(false);
    expect(isTrellisComputerToolFamilyName("trellis_frobnicate")).toBe(false);
    expect(isTrellisComputerToolFamilyName(undefined)).toBe(false);
    expect(isTrellisComputerToolFamilyName(42)).toBe(false);
  });

  it("requires current capability, active turn and non-Plan interaction", () => {
    const permission = { name: "mcp__trellis__computer_click" };
    const allowed = {
      computerControlEnabled: true,
      activeTurn: true,
      interactionMode: "default" as const,
      runtimeMode: "approval-required" as const,
      permission,
    };
    expect(shouldAllowTrellisComputerProviderTool(allowed)).toBe(true);
    expect(
      shouldAllowTrellisComputerProviderTool({ ...allowed, computerControlEnabled: false }),
    ).toBe(false);
    expect(shouldAllowTrellisComputerProviderTool({ ...allowed, activeTurn: false })).toBe(false);
    expect(shouldAllowTrellisComputerProviderTool({ ...allowed, interactionMode: "plan" })).toBe(
      false,
    );
    expect(shouldAllowTrellisComputerProviderTool({ ...allowed, runtimeMode: "auto" })).toBe(false);
  });
});

describe("Trellis gateway tool permission name", () => {
  it.each([
    // Claude's fully-qualified spelling pins the exact `mcp__trellis__` server.
    "mcp__trellis__trellis_create_thread",
    "mcp__trellis__computer_click",
    // `<server>_<tool>` reports (OpenCode) with a real catalog name.
    "trellis_trellis_create_thread",
    "trellis_trellis_project_link_repository",
    "trellis_computer_click",
    "trellis_device_list",
    "trellis_browser_run",
    // Bare `trellis_*` catalog names carry the namespace inside the tool name.
    "trellis_project_link_repository",
    "trellis_e2e_review",
  ])("recognizes a Trellis gateway tool: %s", (providerName) => {
    expect(isTrellisGatewayToolName(providerName)).toBe(true);
  });

  it.each([
    // A user MCP server named `trellis_fs` reports `trellis_fs_<tool>` — the
    // prefix alone must never grant it the auto-approve path.
    "trellis_fs_read",
    "trellis_fs_list_threads",
    "trellis_tools_anything",
    "mcp__trellis_fs__read",
    // The `mcp__trellis__` prefix pins the server, not the tool — the part
    // after it must still be a real catalog name.
    "mcp__trellis__not_a_gateway_tool",
    "mcp__trellis__trellis_create_task",
    "mcp__trellis__trellis_fs_read",
    // Foreign server or entirely unknown names.
    "mcp__other__trellis_create_thread",
    "other_trellis_create_thread",
    "computer_click",
    "browser_click",
    // Names the external-agent MCP surface serves, not the provider gateway.
    "trellis_create_task",
    "trellis_read_task",
    "trellis_overview",
    "trellis_trellis_create_task",
    // Not served by the agent gateway at all.
    "trellis_desktop",
  ])("does not trust a look-alike or foreign name: %s", (providerName) => {
    expect(isTrellisGatewayToolName(providerName)).toBe(false);
  });

  it("accepts a qualified name only when the tool is in the catalog", () => {
    expect(isTrellisGatewayToolName("mcp__trellis__trellis_list_threads")).toBe(true);
    expect(isTrellisGatewayToolName("mcp__trellis__computer_click")).toBe(true);
    expect(
      isTrellisGatewayToolCall({ rawInput: { _toolName: "mcp__trellis__trellis_list_threads" } }),
    ).toBe(true);
  });

  it("never trusts a tool name that only appears in the display title", () => {
    // The title is provider-composed prose — an approval card can render
    // "mcp__trellis__trellis_list_threads" for a request that names no such
    // tool, so the title alone must not authorize anything.
    expect(isTrellisGatewayToolCall({ title: "mcp__trellis__trellis_list_threads" })).toBe(false);
    expect(isTrellisGatewayToolCall({ title: "mcp__trellis__not_a_gateway_tool; rm -rf y" })).toBe(
      false,
    );
  });

  it("rejects non-strings and a look-alike server name in every name field", () => {
    expect(isTrellisGatewayToolName(undefined)).toBe(false);
    expect(isTrellisGatewayToolName(42)).toBe(false);
    expect(isTrellisGatewayToolCall({ name: "trellis_fs_create_thread" })).toBe(false);
    expect(isTrellisGatewayToolCall({ metadata: { toolName: "trellis_fs_read" } })).toBe(false);
    expect(
      isTrellisGatewayToolCall({ rawInput: { _toolName: "trellis_trellis_send_message" } }),
    ).toBe(true);
  });
});
