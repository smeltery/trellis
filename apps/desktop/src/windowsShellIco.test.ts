import FS from "node:fs";
import Path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  encodeWindowsShellIco,
  extractIcoPngImages,
  inspectIcoEntries,
  toWindowsShellIco,
  WINDOWS_SHELL_ICO_BMP_SIZES,
} from "./windowsShellIco";

const appIconWindowsIco = Path.join(
  Path.dirname(fileURLToPath(import.meta.url)),
  "../resources/app-icon-windows.ico",
);

describe("windowsShellIco", () => {
  it("encodes 32-bit BMP entries that Explorer can extract for the taskbar", () => {
    const size = 16;
    const bgra = Buffer.alloc(size * size * 4, 255);
    const ico = encodeWindowsShellIco([{ width: size, height: size, bgra }]);
    const entries = inspectIcoEntries(ico);
    expect(entries).toEqual([{ width: 16, height: 16, encoding: "bmp" }]);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt32LE(18)).toBe(22);
    expect(ico.readUInt32LE(22)).toBe(40);
  });

  it("accepts the supplied Trellis BMP icon without conversion", () => {
    const ico = FS.readFileSync(appIconWindowsIco);
    expect(inspectIcoEntries(ico).every((entry) => entry.encoding === "bmp")).toBe(true);
    expect(inspectIcoEntries(ico).map((entry) => entry.width)).toEqual([256, 128, 64, 48, 32, 16]);
    expect(
      toWindowsShellIco(ico, () => {
        throw new Error("BMP icons need no PNG decoding");
      }),
    ).toEqual(ico);
  });

  it("rebuilds a PNG ICO as BMP sizes used by the Win11 taskbar", () => {
    const png = FS.readFileSync(
      Path.join(Path.dirname(appIconWindowsIco), "../../web/public/favicon-32x32.png"),
    );
    const ico = Buffer.alloc(22 + png.length);
    ico.writeUInt16LE(1, 2);
    ico.writeUInt16LE(1, 4);
    ico[6] = 32;
    ico[7] = 32;
    ico.writeUInt16LE(1, 10);
    ico.writeUInt16LE(32, 12);
    ico.writeUInt32LE(png.length, 14);
    ico.writeUInt32LE(22, 18);
    png.copy(ico, 22);
    expect(extractIcoPngImages(ico).map((image) => image.width)).toEqual([32]);
    const shellIco = toWindowsShellIco(ico, (_png, size) => ({
      width: size,
      height: size,
      bgra: Buffer.alloc(size * size * 4, 128),
    }));
    const entries = inspectIcoEntries(shellIco);
    expect(entries.map((entry) => entry.width)).toEqual([...WINDOWS_SHELL_ICO_BMP_SIZES]);
    expect(entries.every((entry) => entry.encoding === "bmp")).toBe(true);
  });
});
