import assert from "node:assert/strict";
import test from "node:test";

import { hasOnlyGroundedNumbers } from "./import-grounding.ts";

test("allows formatting changes while preserving source numbers", () => {
  assert.equal(hasOnlyGroundedNumbers("Use 1,5 cups and bake for 30min", "Usar 1.5 cups e assar durante 30 min"), true);
});

test("rejects a quantity invented during assisted import", () => {
  assert.equal(hasOnlyGroundedNumbers("Use flour and bake", "Usar 250 g de farinha e assar"), false);
});
