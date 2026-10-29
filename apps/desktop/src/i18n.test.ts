import { afterEach, describe, expect, it } from "vitest";
import {
  initializeDesktopI18n,
  setDesktopLanguagePreference,
  t,
  translateNativeMenuRoles,
} from "./i18n";

afterEach(() => initializeDesktopI18n("system", () => "en-US"));

describe("native interface language", () => {
  it("blocks restored, requested and System Chinese in Stable while Beta can activate it", () => {
    initializeDesktopI18n("zh-CN", () => ["zh-CN", "es-MX"], "production");
    expect(t("desktop:settings")).toBe("Ajustes...");
    setDesktopLanguagePreference("system");
    expect(t("desktop:settings")).toBe("Ajustes...");
    setDesktopLanguagePreference("en");
    expect(t("desktop:settings")).toBe("Settings...");
    setDesktopLanguagePreference("zh-CN");
    expect(t("desktop:settings")).toBe("Ajustes...");
    setDesktopLanguagePreference("es");
    expect(t("desktop:settings")).toBe("Ajustes...");
    initializeDesktopI18n("zh-CN", () => "en-US", "beta");
    expect(t("desktop:settings")).toBe("设置…");
  });

  it("does not interpret literal app data or renderer namespaces as native translation keys", () => {
    initializeDesktopI18n("zh-CN", () => ["en-US"]);
    for (const value of [
      "https://api2.cursor.sh",
      "C:\\Users\\name",
      "Edit: name",
      "provider:model-name",
      "workspace:toast_settings",
    ])
      expect(t(value)).toBe(value);
    expect(t("desktop:settings")).toBe("设置…");
  });
  it("uses Chinese before a renderer opens, with script-aware System fallback", () => {
    initializeDesktopI18n("zh-CN", () => ["en-US"]);
    expect(t("desktop:settings")).toBe("设置…");
    expect(t("desktop:quit", { app: "Trellis Beta" })).toBe("退出 Trellis Beta？");
    initializeDesktopI18n("system", () => ["zh-Hant-TW", "zh-Hans-SG", "en"]);
    expect(t("desktop:settings")).toBe("设置…");
    initializeDesktopI18n("system", () => ["zh-TW", "en-US"]);
    expect(t("desktop:settings")).toBe("Settings...");
    initializeDesktopI18n("system", () => ["en-US", "zh-CN"]);
    expect(t("desktop:settings")).toBe("Settings...");
  });

  it("changes Chinese native labels while preserving role actions and app-owned text", () => {
    const item = { label: "Quit", role: "quit", accelerator: "Command+Q", id: "quit" };
    const speech = {
      label: "Speech",
      role: null,
      submenu: {
        items: [
          { label: "Start Speaking", role: "startspeaking" },
          { label: "Stop Speaking", role: "stopspeaking" },
        ],
      },
    };
    const substitutions = {
      label: "Substitutions",
      submenu: { items: [{ label: "Show Substitutions", role: "showsubstitutions" }] },
    };
    const menu = {
      items: [
        { label: "Trellis", role: null, submenu: { items: [item] } },
        { label: "Edit", role: "editmenu", submenu: { items: [speech, substitutions] } },
      ],
    };
    initializeDesktopI18n("zh-CN", () => ["en-US"]);
    translateNativeMenuRoles(menu, "Trellis");
    expect(item).toEqual({
      label: "退出 Trellis",
      role: "quit",
      accelerator: "Command+Q",
      id: "quit",
    });
    expect(menu.items[0]?.label).toBe("Trellis");
    expect(speech.label).toBe("朗读");
    expect(substitutions.label).toBe("替换");
    expect(speech.submenu.items[0]?.role).toBe("startspeaking");
    setDesktopLanguagePreference("en");
    translateNativeMenuRoles(menu, "Trellis");
    expect(item.label).toBe("Quit Trellis");
    expect(speech.label).toBe("Speech");
    expect(substitutions.label).toBe("Substitutions");
  });
  it("handles Electron's lowercase roles when relabeling generated menus", () => {
    const item = {
      label: "Developer Tools",
      role: "toggledevtools",
      accelerator: "Alt+Command+I",
      id: "developer-tools",
    };
    const menu = { items: [{ label: "Edit", role: "editmenu", submenu: { items: [item] } }] };
    initializeDesktopI18n("es", () => "en-US");
    translateNativeMenuRoles(menu, "Trellis");
    expect(menu.items[0]?.label).toBe("Editar");
    expect(item).toEqual({
      label: "Herramientas de desarrollo",
      role: "toggledevtools",
      accelerator: "Alt+Command+I",
      id: "developer-tools",
    });
  });

  it("uses the startup preference and resolves System from the operating-system locale", () => {
    initializeDesktopI18n("es", () => "en-US");
    expect(t("desktop:common_yes")).toBe("Sí");
    setDesktopLanguagePreference("system");
    expect(t("desktop:common_yes")).toBe("Yes");
    initializeDesktopI18n("system", () => "es-MX");
    expect(t("desktop:common_yes")).toBe("Sí");
    initializeDesktopI18n("system", () => "fr-FR");
    expect(t("desktop:common_yes")).toBe("Yes");
  });

  it("updates native role labels while keeping role actions, IDs and accelerators intact", () => {
    const quit = {
      label: "Quit Trellis Beta",
      role: "quit",
      id: "quit-action",
      accelerator: "Command+Q",
    };
    const menu = { items: [{ label: "Trellis Beta", submenu: { items: [quit] } }] };
    initializeDesktopI18n("en", () => "en-US");
    translateNativeMenuRoles(menu, "Trellis Beta");
    expect(quit.label).toBe("Quit Trellis Beta");
    setDesktopLanguagePreference("es");
    translateNativeMenuRoles(menu, "Trellis Beta");
    expect(quit).toEqual({
      label: "Salir de Trellis Beta",
      role: "quit",
      id: "quit-action",
      accelerator: "Command+Q",
    });
    expect(menu.items[0]?.label).toBe("Trellis Beta");
  });

  it("interpolates app and error data without looking them up as messages", () => {
    initializeDesktopI18n("es", () => "en-US");
    expect(t("desktop:quit", { app: "Yes" })).toBe("¿Salir de Yes?");
  });
});
