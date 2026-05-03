/** Aligned with contracts/openapi/openapi.yaml components.schemas */

export interface AvailableSlot {
  startAt: string;
  endAt: string;
}

export interface Booking {
  id: string;
  eventTypeId: string;
  startAt: string;
  endAt: string;
  guestDisplayName?: string;
  guestContact?: string;
}

export interface EventType {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
}

export interface GuestBookingRequest {
  eventTypeId: string;
  startAt: string;
  guestDisplayName?: string;
  guestContact?: string;
}

export interface SlotRow {
  startAt: string;
  endAt: string;
  available: boolean;
}
