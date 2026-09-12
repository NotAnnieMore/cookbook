export function parseDurationInput(value: string) {
  const normalized = value.trim().toLocaleLowerCase("pt-PT").replace(/\s+/g, " ");
  if (!normalized) return null;

  if (/^\d+$/.test(normalized)) return Number(normalized);

  const clock = normalized.match(/^(\d+)\s*:\s*([0-5]?\d)$/);
  if (clock) return (Number(clock[1]) * 60) + Number(clock[2]);

  const hoursAndMinutes = normalized.match(/^(\d+)\s*h(?:oras?)?\s*(?:(\d{1,2})\s*(?:m|min|mins|minutos?)?)?$/);
  if (hoursAndMinutes) {
    const minutes = Number(hoursAndMinutes[2] ?? 0);
    return minutes < 60 ? (Number(hoursAndMinutes[1]) * 60) + minutes : Number.NaN;
  }

  const minutesOnly = normalized.match(/^(\d+)\s*(?:m|min|mins|minutos?)$/);
  return minutesOnly ? Number(minutesOnly[1]) : Number.NaN;
}

export function durationInputToMinutes(value: string) {
  const parsed = parseDurationInput(value);
  if (parsed === null) return "";
  return Number.isFinite(parsed) ? String(parsed) : "invalid";
}

export function formatDurationInput(value: string | number | null | undefined) {
  const total = typeof value === "number" ? value : Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(total) || total < 0) return "";
  if (total < 60) return `${total}min`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return minutes ? `${hours}h ${minutes}min` : `${hours}h`;
}

export function timerInputToSeconds(value: string) {
  const minutes = parseDurationInput(value);
  if (minutes === null) return null;
  return Number.isFinite(minutes) && minutes > 0 ? minutes * 60 : Number.NaN;
}

export function formatTimerInput(seconds: number | null | undefined) {
  if (!seconds || seconds < 60 || seconds % 60 !== 0) return "";
  return formatDurationInput(seconds / 60);
}
