import { win32 } from "node:path";

export function portableTarExecutable(
  platform: NodeJS.Platform = process.platform,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  if (platform !== "win32") return "tar";
  const systemRoot = environment.SystemRoot ?? environment.SYSTEMROOT;
  if (!systemRoot) throw new Error("SystemRoot is required to locate native Windows tar.exe");
  // Git Bash's tar interprets native drive paths using Unix path rules.
  return win32.join(systemRoot, "System32", "tar.exe");
}
