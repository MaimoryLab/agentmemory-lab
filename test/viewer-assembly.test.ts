import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// Drift guard for STEP-01 (PLAN-007): src/viewer/index.html is a GENERATED
// artifact assembled from src/viewer/parts/* by scripts/build-viewer-html.mjs.
// These tests fail if index.html and parts/ fall out of sync (e.g. someone
// hand-edited index.html, or edited a fragment without running
// `npm run viewer:build`). The assembly is re-implemented here independently
// so the guard does not merely re-run the build script's own logic.
const VIEWER_DIR = join("src", "viewer");
const PARTS_DIR = join(VIEWER_DIR, "parts");

function manifest(): string[] {
  const parsed = JSON.parse(readFileSync(join(PARTS_DIR, "manifest.json"), "utf-8"));
  expect(Array.isArray(parsed)).toBe(true);
  expect(parsed.length).toBeGreaterThan(0);
  return parsed as string[];
}

function assemble(): string {
  return manifest()
    .map((name) => readFileSync(join(PARTS_DIR, name), "utf-8"))
    .join("");
}

describe("viewer index.html assembly (PLAN-007 STEP-01)", () => {
  it("every fragment named in the manifest exists", () => {
    for (const name of manifest()) {
      expect(existsSync(join(PARTS_DIR, name)), `missing fragment ${name}`).toBe(true);
    }
  });

  it("assembling parts/ reproduces the committed index.html byte-for-byte", () => {
    const committed = readFileSync(join(VIEWER_DIR, "index.html"), "utf-8");
    expect(assemble()).toBe(committed);
  });

  it("preserves the nonce placeholder the server replaces per request", () => {
    const html = readFileSync(join(VIEWER_DIR, "index.html"), "utf-8");
    // document.ts replaceAll()s this each request; losing it breaks nonce/CSP.
    expect(html).toContain("__AGENTMEMORY_VIEWER_NONCE__");
  });

  it("keeps exactly one nonce'd script tag intact (CSP relies on it)", () => {
    const html = readFileSync(join(VIEWER_DIR, "index.html"), "utf-8");
    const realTag = html.match(/<script nonce="__AGENTMEMORY_VIEWER_NONCE__">/g) ?? [];
    expect(realTag.length).toBe(1);
  });
});
