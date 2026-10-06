import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
for (const route of ["index.html", "download/index.html"]) {
  const html = readFileSync(`apps/marketing/dist/${route}`, "utf8");
  assert.match(html, /Trellis/);
  assert.match(html, /smeltery\/trellis/);
  assert.doesNotMatch(html, /synara|trytrellis/i);
  assert.match(html, /<meta name="description"/);
}
console.log("Trellis homepage and download page passed.");
