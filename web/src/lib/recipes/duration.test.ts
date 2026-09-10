import assert from "node:assert/strict";
import test from "node:test";

import { combineDurationParts, splitDurationMinutes } from "./duration.ts";

test("splits stored minutes into editable hours and minutes", () => {
  assert.deepEqual(splitDurationMinutes("185"), { hours: "3", minutes: "5" });
  assert.deepEqual(splitDurationMinutes(""), { hours: "", minutes: "" });
});

test("combines hours and minutes for storage", () => {
  assert.equal(combineDurationParts("2", "30"), "150");
  assert.equal(combineDurationParts("", "45"), "45");
  assert.equal(combineDurationParts("", ""), "");
});
