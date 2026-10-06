import * as FS from "node:fs";
import * as OS from "node:os";
import * as Path from "node:path";

import { describe, expect, it } from "vitest";

import {
  acknowledgeTrellisStorageSnapshot,
  readTrellisStorageSnapshot,
  TRELLIS_STORAGE_SNAPSHOT_MAX_BYTES,
  validateTrellisStorageSnapshot,
} from "./desktopStorageMigration";

const snapshot = () => ({
  version: 1 as const,
  exportedAt: "2026-07-09T00:00:00.000Z",
  entries: {
    "trellis:theme": "dark",
    "trellis.openUsage.enabled": "true",
  },
});

describe("desktopStorageMigration", () => {
  it("reads a legacy snapshot and removes it after acknowledgement", async () => {
    const directory = FS.mkdtempSync(Path.join(OS.tmpdir(), "trellis-storage-migration-"));
    const target = Path.join(directory, "snapshot.json");
    try {
      FS.writeFileSync(target, `${JSON.stringify(snapshot())}\n`);
      expect(readTrellisStorageSnapshot(target)).toEqual(snapshot());

      await acknowledgeTrellisStorageSnapshot(target);
      expect(readTrellisStorageSnapshot(target)).toBeNull();
    } finally {
      FS.rmSync(directory, { recursive: true, force: true });
    }
  });

  it("rejects malformed, disallowed, and oversized snapshots", () => {
    expect(validateTrellisStorageSnapshot({ version: 1 })).toBeNull();
    expect(
      validateTrellisStorageSnapshot({
        ...snapshot(),
        entries: { "foreign:theme": "dark" },
      }),
    ).toBeNull();
    expect(
      validateTrellisStorageSnapshot({
        ...snapshot(),
        entries: { "trellis:large": "x".repeat(TRELLIS_STORAGE_SNAPSHOT_MAX_BYTES) },
      }),
    ).toBeNull();
  });

  it("accepts renderer snapshots containing large composer drafts", () => {
    const largeDraft = "x".repeat(2 * 1024 * 1024);

    expect(
      validateTrellisStorageSnapshot({
        ...snapshot(),
        entries: { "trellis:composer-drafts:v1": largeDraft },
      })?.entries["trellis:composer-drafts:v1"],
    ).toBe(largeDraft);
  });

  it("treats missing and malformed files as absent", () => {
    const directory = FS.mkdtempSync(Path.join(OS.tmpdir(), "trellis-storage-migration-"));
    const target = Path.join(directory, "snapshot.json");
    try {
      expect(readTrellisStorageSnapshot(target)).toBeNull();
      FS.writeFileSync(target, "not json");
      expect(readTrellisStorageSnapshot(target)).toBeNull();
    } finally {
      FS.rmSync(directory, { recursive: true, force: true });
    }
  });
});
