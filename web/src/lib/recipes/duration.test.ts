import assert from "node:assert/strict";
import test from "node:test";

import { durationInputToMinutes, formatDurationInput, parseDurationInput } from "./duration.ts";

test("formats stored minutes as a natural duration", () => {
  assert.equal(formatDurationInput("185"), "3h 5min");
  assert.equal(formatDurationInput("360"), "6h");
  assert.equal(formatDurationInput(""), "");
});

test("accepts hours, hours with minutes, clock notation and plain minutes", () => {
  assert.equal(parseDurationInput("6h"), 360);
  assert.equal(parseDurationInput("4h 30min"), 270);
  assert.equal(parseDurationInput("2h30"), 150);
  assert.equal(parseDurationInput("1:45"), 105);
  assert.equal(parseDurationInput("45min"), 45);
  assert.equal(parseDurationInput("45"), 45);
  assert.equal(durationInputToMinutes("4h"), "240");
  assert.equal(durationInputToMinutes("quatro horas"), "invalid");
});
