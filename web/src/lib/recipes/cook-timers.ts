export type CookTimerStatus = "idle" | "running" | "paused" | "done";

export type CookTimer = {
  durationSeconds: number;
  remainingSeconds: number;
  endsAt: number | null;
  status: CookTimerStatus;
  notified: boolean;
};

export type SavedCookTimer = Partial<CookTimer>;

export function createCookTimer(durationSeconds: number): CookTimer {
  return {
    durationSeconds,
    remainingSeconds: durationSeconds,
    endsAt: null,
    status: "idle",
    notified: false,
  };
}

export function remainingCookTimerSeconds(timer: CookTimer, now = Date.now()) {
  if (timer.status !== "running" || timer.endsAt === null) return timer.remainingSeconds;
  return Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
}

export function startCookTimer(timer: CookTimer, now = Date.now()): CookTimer {
  const remaining = timer.status === "done" || timer.remainingSeconds <= 0
    ? timer.durationSeconds
    : remainingCookTimerSeconds(timer, now);
  return {
    ...timer,
    remainingSeconds: remaining,
    endsAt: now + remaining * 1000,
    status: "running",
    notified: false,
  };
}

export function pauseCookTimer(timer: CookTimer, now = Date.now()): CookTimer {
  const remaining = remainingCookTimerSeconds(timer, now);
  return {
    ...timer,
    remainingSeconds: remaining,
    endsAt: null,
    status: remaining > 0 ? "paused" : "done",
  };
}

export function resetCookTimer(timer: CookTimer): CookTimer {
  return createCookTimer(timer.durationSeconds);
}

export function adjustCookTimer(timer: CookTimer, deltaSeconds: number, now = Date.now()): CookTimer {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds === 0) return timer;

  const durationSeconds = Math.max(60, Math.round(timer.durationSeconds + deltaSeconds));
  const currentRemaining = remainingCookTimerSeconds(timer, now);
  const remainingSeconds = timer.status === "idle"
    ? durationSeconds
    : Math.min(durationSeconds, Math.max(0, currentRemaining + deltaSeconds));

  if (timer.status === "running") {
    return {
      ...timer,
      durationSeconds,
      remainingSeconds,
      endsAt: remainingSeconds > 0 ? now + remainingSeconds * 1000 : null,
      status: remainingSeconds > 0 ? "running" : "done",
      notified: false,
    };
  }

  return {
    ...timer,
    durationSeconds,
    remainingSeconds,
    endsAt: null,
    status: remainingSeconds === 0 ? "done" : timer.status === "done" ? "paused" : timer.status,
    notified: remainingSeconds === 0 ? timer.notified : false,
  };
}

export function tickCookTimers(timers: Record<string, CookTimer>, now = Date.now()) {
  let changed = false;
  const next = Object.fromEntries(Object.entries(timers).map(([stepId, timer]) => {
    if (timer.status !== "running") return [stepId, timer];
    const remainingSeconds = remainingCookTimerSeconds(timer, now);
    if (remainingSeconds === timer.remainingSeconds && remainingSeconds > 0) return [stepId, timer];
    changed = true;
    return [stepId, {
      ...timer,
      remainingSeconds,
      endsAt: remainingSeconds > 0 ? timer.endsAt : null,
      status: remainingSeconds > 0 ? "running" : "done",
      notified: remainingSeconds > 0 ? timer.notified : false,
    } satisfies CookTimer];
  }));
  return changed ? next : timers;
}

export function restoreCookTimer(durationSeconds: number, saved: SavedCookTimer | undefined, now = Date.now()): CookTimer {
  const fallback = createCookTimer(durationSeconds);
  if (!saved || saved.durationSeconds !== durationSeconds) return fallback;
  const remaining = typeof saved.remainingSeconds === "number"
    ? Math.min(Math.max(0, Math.round(saved.remainingSeconds)), durationSeconds)
    : durationSeconds;
  const status = saved.status;
  if (status === "running" && typeof saved.endsAt === "number") {
    const running: CookTimer = {
      durationSeconds,
      remainingSeconds: remaining,
      endsAt: saved.endsAt,
      status: "running",
      notified: Boolean(saved.notified),
    };
    return tickCookTimers({ timer: running }, now).timer;
  }
  if (status === "paused" && remaining > 0) return { ...fallback, remainingSeconds: remaining, status: "paused" };
  if (status === "done" || remaining === 0) return { ...fallback, remainingSeconds: 0, status: "done", notified: Boolean(saved.notified) };
  return fallback;
}
