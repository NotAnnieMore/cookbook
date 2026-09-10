export function splitDurationMinutes(value: string | number | null | undefined) {
  const total = typeof value === "number" ? value : Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(total) || total < 0) return { hours: "", minutes: "" };
  return {
    hours: String(Math.floor(total / 60)),
    minutes: String(total % 60),
  };
}

export function combineDurationParts(hours: string, minutes: string) {
  if (!hours.trim() && !minutes.trim()) return "";
  const hourValue = Math.max(0, Number.parseInt(hours || "0", 10) || 0);
  const minuteValue = Math.max(0, Number.parseInt(minutes || "0", 10) || 0);
  return String((hourValue * 60) + minuteValue);
}
