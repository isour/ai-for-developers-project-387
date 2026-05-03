import { addDays, startOfDay } from "date-fns";

/** Гостевое окно записи — 14 дней от «сегодня», как в контракте. */
export function getGuestWindowBounds(now: Date = new Date()) {
  const from = startOfDay(now);
  const to = addDays(from, 14);
  return { from, to };
}
