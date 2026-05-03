import type { AvailableSlot } from "./types";
import { dayKeyRu } from "@/shared/lib/calendar-day-key";

/** Локальная «отметка» начала слота: календарный день + часы:минуты (Prism может отдать другой ISO-литерал того же мгновения). */
export function slotStartFingerprint(d: Date): string {
  return `${dayKeyRu(d)}|${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function freeSlotFingerprints(slots: AvailableSlot[]): Set<string> {
  return new Set(slots.map((s) => slotStartFingerprint(new Date(s.startAt))));
}

/** В dev Prism часто даёт пустой массив или «рандомные» date-time вне сетки UI — тогда показываем сетку целиком свободной. */
export function prismSlotFallbackEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_PRISM_SLOT_FALLBACK !== "0";
}
