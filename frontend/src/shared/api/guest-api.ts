import { addDays, compareAsc, formatISO, isBefore, parseISO, startOfDay } from "date-fns";

import { iterateDaySlots } from "@/shared/lib/day-slots";

import type { AvailableSlot, Booking, EventType, GuestBookingRequest, SlotRow } from "./types";
import { getGuestWindowBounds } from "./guest-window";
import { fetchJson } from "./http-client";
import { freeSlotFingerprints, prismSlotFallbackEnabled, slotStartFingerprint } from "./slot-matching";

function qs(params: Record<string, string>) {
  return new URLSearchParams(params).toString();
}

/** Окно для GET /owner/bookings: UTC RFC3339 без миллисекунд (совместимо с Go time.RFC3339). */
function toBookingWindowRFC3339UTC(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function availableSlotsPath(eventTypeId: string, fromIso: string, toIso: string) {
  const q = qs({ from: fromIso, to: toIso });
  return `/guest/event-types/${encodeURIComponent(eventTypeId)}/available-slots?${q}`;
}

async function listAvailableSlotsHttp(eventTypeId: string, fromIso: string, toIso: string): Promise<AvailableSlot[]> {
  return fetchJson<AvailableSlot[]>(availableSlotsPath(eventTypeId, fromIso, toIso));
}

async function listEventTypesHttp(): Promise<EventType[]> {
  return fetchJson<EventType[]>("/guest/event-types");
}

async function getDurationByEventTypeId(eventTypeId: string): Promise<number | null> {
  const list = await listEventTypesHttp();
  return list.find((e) => e.id === eventTypeId)?.durationMinutes ?? null;
}

export const guestApi = {
  getGuestWindowBounds,

  listEventTypes: (): Promise<EventType[]> => listEventTypesHttp(),

  getEventTypeById: async (id: string): Promise<EventType | null> => {
    const list = await listEventTypesHttp();
    return list.find((e) => e.id === id) ?? null;
  },

  listAvailableSlots: listAvailableSlotsHttp,

  listSlotRowsForDay: async (eventTypeId: string, day: Date): Promise<SlotRow[]> => {
    const type = await listEventTypesHttp().then((list) => list.find((e) => e.id === eventTypeId) ?? null);
    if (!type) return [];
    const bounds = getGuestWindowBounds();
    const d0 = startOfDay(day);
    if (isBefore(d0, bounds.from) || !isBefore(d0, bounds.to)) return [];
    const fromIso = formatISO(d0);
    const toIso = formatISO(addDays(d0, 1));
    let available: AvailableSlot[] = [];
    try {
      available = await listAvailableSlotsHttp(eventTypeId, fromIso, toIso);
    } catch {
      return [];
    }
    const freeFp = freeSlotFingerprints(available);
    const cells = iterateDaySlots(d0, type.durationMinutes);
    let rows: SlotRow[] = cells.map(({ start, end }) => ({
      startAt: formatISO(start),
      endAt: formatISO(end),
      available: freeFp.has(slotStartFingerprint(start)),
    }));
    if (prismSlotFallbackEnabled() && cells.length > 0 && !rows.some((r) => r.available)) {
      rows = cells.map(({ start, end }) => ({
        startAt: formatISO(start),
        endAt: formatISO(end),
        available: true,
      }));
    }
    return rows;
  },

  countAvailableForMonthKeys: async (eventTypeId: string, keys: Set<string>): Promise<Map<string, number>> => {
    const counts = new Map<string, number>();
    for (const k of keys) counts.set(k, 0);
    if (keys.size === 0) return counts;

    const days: Date[] = [];
    for (const key of keys) {
      const parts = key.split("-").map(Number);
      const y = parts[0] ?? NaN;
      const m = parts[1] ?? NaN;
      const d = parts[2] ?? NaN;
      if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) continue;
      days.push(new Date(y, m - 1, d));
    }
    if (days.length === 0) return counts;

    const tMin = days.reduce((a, b) => (a < b ? a : b));
    const tMax = days.reduce((a, b) => (a > b ? a : b));
    const bounds = getGuestWindowBounds();
    const rangeStart = startOfDay(tMin);
    const rangeEndExclusive = addDays(startOfDay(tMax), 1);
    const from = rangeStart < bounds.from ? bounds.from : rangeStart;
    const to = rangeEndExclusive > bounds.to ? bounds.to : rangeEndExclusive;
    if (!isBefore(from, to)) return counts;

    let available: AvailableSlot[] = [];
    try {
      available = await listAvailableSlotsHttp(eventTypeId, formatISO(from), formatISO(to));
    } catch {
      return counts;
    }

    const duration = await getDurationByEventTypeId(eventTypeId);
    if (!duration) return counts;

    const freeFp = freeSlotFingerprints(available);

    for (const key of keys) {
      const parts = key.split("-").map(Number);
      const y = parts[0] ?? NaN;
      const m = parts[1] ?? NaN;
      const d = parts[2] ?? NaN;
      if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) continue;
      const dday = startOfDay(new Date(y, m - 1, d));
      if (isBefore(dday, bounds.from) || !isBefore(dday, bounds.to)) {
        counts.set(key, 0);
        continue;
      }
      const grid = iterateDaySlots(dday, duration);
      const matchedCells = grid.filter(({ start }) => freeFp.has(slotStartFingerprint(start))).length;
      const n =
        prismSlotFallbackEnabled() && grid.length > 0 && matchedCells === 0 ? grid.length : matchedCells;
      counts.set(key, n);
    }
    return counts;
  },

  createBooking: (body: GuestBookingRequest): Promise<Booking> =>
    fetchJson<Booking>("/guest/bookings", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listUpcomingBookings: async (now: Date = new Date()): Promise<Booking[]> => {
    const fromIso = toBookingWindowRFC3339UTC(now);
    const toIso = toBookingWindowRFC3339UTC(addDays(now, 366));
    const list = await fetchJson<Booking[]>(`/owner/bookings?${qs({ from: fromIso, to: toIso })}`);
    if (!Array.isArray(list)) {
      return [];
    }
    // Встреча «ещё не закончилась» по времени окончания (текущие и будущие).
    // Date.parse устойчивее к вариациям RFC3339 от Go, чем parseISO в отдельных случаях.
    return list
      .filter((b) => {
        const endMs = Date.parse(b.endAt);
        if (Number.isNaN(endMs)) return true;
        return endMs > now.getTime();
      })
      .sort((a, b) => compareAsc(parseISO(a.startAt), parseISO(b.startAt)));
  },

  countFreeSlotsOnDay: async (eventTypeId: string, day: Date): Promise<number> => {
    const d0 = startOfDay(day);
    const bounds = getGuestWindowBounds();
    if (isBefore(d0, bounds.from) || !isBefore(d0, bounds.to)) return 0;
    const fromIso = formatISO(d0);
    const toIso = formatISO(addDays(d0, 1));
    try {
      const slots = await listAvailableSlotsHttp(eventTypeId, fromIso, toIso);
      const dur = await getDurationByEventTypeId(eventTypeId);
      if (!dur) return 0;
      const grid = iterateDaySlots(d0, dur);
      const fp = freeSlotFingerprints(slots);
      const matched = grid.filter(({ start }) => fp.has(slotStartFingerprint(start))).length;
      if (prismSlotFallbackEnabled() && (slots.length === 0 || (slots.length > 0 && matched === 0))) {
        return grid.length;
      }
      return matched;
    } catch {
      return 0;
    }
  },
};
