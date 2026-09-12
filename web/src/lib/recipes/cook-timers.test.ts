import assert from "node:assert/strict";
import test from "node:test";

import { adjustCookTimer, createCookTimer, pauseCookTimer, resetCookTimer, restoreCookTimer, startCookTimer, tickCookTimers } from "./cook-timers.ts";

test("uses a deadline so a timer remains accurate after background throttling", () => {
  const started = startCookTimer(createCookTimer(600), 1_000);
  const ticked = tickCookTimers({ step: started }, 121_000).step;
  assert.equal(ticked.remainingSeconds, 480);
  assert.equal(ticked.status, "running");
});

test("keeps several step timers independent and restores an expired one", () => {
  const timers = {
    oven: startCookTimer(createCookTimer(300), 0),
    sauce: startCookTimer(createCookTimer(60), 10_000),
  };
  const ticked = tickCookTimers(timers, 70_000);
  assert.equal(ticked.oven.remainingSeconds, 230);
  assert.equal(ticked.sauce.status, "done");

  const restored = restoreCookTimer(60, timers.sauce, 80_000);
  assert.equal(restored.status, "done");
  assert.equal(restored.remainingSeconds, 0);
});

test("pauses a running timer with its deadline-adjusted remainder", () => {
  const paused = pauseCookTimer(startCookTimer(createCookTimer(90), 1_000), 31_000);
  assert.equal(paused.status, "paused");
  assert.equal(paused.remainingSeconds, 60);
  assert.equal(paused.endsAt, null);
});

test("stops and fully resets a timer for the next cooking session", () => {
  const paused = pauseCookTimer(startCookTimer(createCookTimer(120), 1_000), 31_000);
  const reset = resetCookTimer(paused);
  assert.equal(reset.status, "idle");
  assert.equal(reset.remainingSeconds, 120);
  assert.equal(reset.endsAt, null);
  assert.equal(reset.notified, false);
});

test("adds or removes one minute while keeping an active timer accurate", () => {
  const running = startCookTimer(createCookTimer(600), 1_000);
  const extended = adjustCookTimer(running, 60, 121_000);
  assert.equal(extended.durationSeconds, 660);
  assert.equal(extended.remainingSeconds, 540);
  assert.equal(extended.endsAt, 661_000);

  const shortened = adjustCookTimer(extended, -60, 181_000);
  assert.equal(shortened.durationSeconds, 600);
  assert.equal(shortened.remainingSeconds, 420);
  assert.equal(shortened.endsAt, 601_000);
});

test("never reduces a timer below one minute", () => {
  const timer = adjustCookTimer(createCookTimer(60), -60);
  assert.equal(timer.durationSeconds, 60);
  assert.equal(timer.remainingSeconds, 60);
});
