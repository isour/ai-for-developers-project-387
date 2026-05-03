import { addMinutes, startOfDay } from "date-fns";

/** Потенциальные старты слотов в дне [09:00, 18:00) с шагом durationMinutes — как ожидаем на стороне API. */
export function iterateDaySlots(day: Date, durationMinutes: number): { start: Date; end: Date }[] {
  const dayStart = startOfDay(day);
  const out: { start: Date; end: Date }[] = [];
  for (let minsFromMidnight = 9 * 60; minsFromMidnight + durationMinutes <= 18 * 60; minsFromMidnight += durationMinutes) {
    const start = addMinutes(dayStart, minsFromMidnight);
    const end = addMinutes(start, durationMinutes);
    out.push({ start, end });
  }
  return out;
}
