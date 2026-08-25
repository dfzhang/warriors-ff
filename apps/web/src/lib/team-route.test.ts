import assert from "node:assert/strict";
import test from "node:test";

import { getTeamRouteSegment, sanitizeTeamRouteSegment } from "./team-route.ts";

test("safe team abbreviations are unchanged", () => {
  assert.equal(sanitizeTeamRouteSegment("ZACK"), "ZACK");
});

test("invisible and formatting characters are removed", () => {
  assert.equal(sanitizeTeamRouteSegment(`ZA${"\u200B".repeat(300)}CK`), "ZACK");
});

test("an empty abbreviation falls back to the team ID", () => {
  assert.equal(getTeamRouteSegment("\u200B", 12), "12");
});

test("route segments are capped at a filesystem-safe length", () => {
  assert.equal(sanitizeTeamRouteSegment("A".repeat(100)).length, 63);
});
