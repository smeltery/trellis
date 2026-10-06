import { describe, expect, it } from "vitest";

import {
  buildExternalMcpClientConfiguration,
  buildExternalMcpExamplePrompt,
  buildExternalMcpSetupPrompt,
  describeExternalMcpPermissions,
  externalMcpSetupAction,
} from "./externalMcpSetup";

const stdio = {
  command: "/Applications/Trellis.app/Contents/MacOS/Trellis",
  args: [
    "server.js",
    "mcp",
    "serve",
    "--integration",
    "mcp_int_example",
    "--home-dir",
    "/tmp/Trellis home",
  ],
  env: { ELECTRON_RUN_AS_NODE: "1" },
};

describe("external MCP guided setup", () => {
  it("builds copyable Codex and Claude Code commands without embedding a credential", () => {
    const codex = buildExternalMcpClientConfiguration("codex", stdio);
    const claude = buildExternalMcpClientConfiguration("claudeCode", stdio);

    expect(codex.value).toBe(
      "codex mcp add trellis --env ELECTRON_RUN_AS_NODE=1 -- /Applications/Trellis.app/Contents/MacOS/Trellis server.js mcp serve --integration mcp_int_example --home-dir '/tmp/Trellis home'",
    );
    expect(claude.value).toBe(
      "claude mcp add --scope user trellis -e ELECTRON_RUN_AS_NODE=1 -- /Applications/Trellis.app/Contents/MacOS/Trellis server.js mcp serve --integration mcp_int_example --home-dir '/tmp/Trellis home'",
    );
    expect(`${codex.value}${claude.value}`).not.toContain("syn_mcp_v1_");
  });

  it("builds standard JSON configuration for desktop and other clients", () => {
    const desktop = buildExternalMcpClientConfiguration("claudeDesktop", stdio);
    const parsed = JSON.parse(desktop.value) as {
      mcpServers: { trellis: { command: string; args: ReadonlyArray<string> } };
    };

    expect(desktop.format).toBe("json");
    expect(parsed.mcpServers.trellis).toEqual(stdio);
  });

  it("builds terminal commands for PowerShell on Windows", () => {
    const codex = buildExternalMcpClientConfiguration("codex", stdio, "Win32");
    expect(codex.value).toBe(
      "& 'codex' 'mcp' 'add' 'trellis' '--env' 'ELECTRON_RUN_AS_NODE=1' '--' '/Applications/Trellis.app/Contents/MacOS/Trellis' 'server.js' 'mcp' 'serve' '--integration' 'mcp_int_example' '--home-dir' '/tmp/Trellis home'",
    );
    expect(codex.instruction).toContain("PowerShell");
  });

  it("builds a project-specific prompt without exposing implementation identifiers", () => {
    const prompt = buildExternalMcpExamplePrompt("Trellis app");

    expect(prompt).toContain('project named "Trellis app"');
    expect(prompt).toContain("managed worktree");
    expect(prompt).toContain("approval-required");
    expect(prompt).not.toContain("projectId");
    expect(prompt).not.toContain("request ID");
    expect(prompt).not.toContain("mcp_int_");
  });

  it("builds one agent-facing setup prompt covering pairing, registration, and verification", () => {
    const prompt = buildExternalMcpSetupPrompt({
      setupCommand: "trellis mcp pair --code syn_pair_v1_example --home-dir /tmp/home",
      stdio,
    });

    expect(prompt).toContain("syn_pair_v1_example");
    expect(prompt).toContain("codex mcp add trellis");
    expect(prompt).toContain("claude mcp add --scope user trellis");
    expect(prompt).toContain('"mcpServers"');
    expect(prompt).toContain("trellis_overview");
    expect(prompt).not.toContain("syn_mcp_v1_");
  });

  it("omits the pairing step once the computer is already paired", () => {
    const prompt = buildExternalMcpSetupPrompt({ setupCommand: null, stdio });

    expect(prompt).toContain("already completed");
    expect(prompt).not.toContain("syn_pair_v1_");
    expect(prompt).toContain("trellis_overview");
  });

  it("builds a discovery-first example prompt for all-projects connections", () => {
    const prompt = buildExternalMcpExamplePrompt(null);

    expect(prompt).toContain("trellis_overview");
    expect(prompt).toContain("managed worktree");
  });

  it("describes scopes without exposing capability identifiers", () => {
    const description = describeExternalMcpPermissions([
      "projects:read",
      "tasks:create",
      "tasks:wait",
      "tasks:read",
      "runtime:local",
    ]);

    expect(description).toBe("Create and follow its own tasks · Use the shared local checkout");
    expect(description).not.toContain("runtime:local");
  });

  it("offers a non-destructive resume path when only the pairing code expired", () => {
    expect(
      externalMcpSetupAction({
        revoked: false,
        integrationExpired: false,
        paired: false,
        pairingExpired: true,
      }),
    ).toBe("resume-pairing");
    expect(
      externalMcpSetupAction({
        revoked: false,
        integrationExpired: true,
        paired: false,
        pairingExpired: true,
      }),
    ).toBe("revoke");
  });
});
