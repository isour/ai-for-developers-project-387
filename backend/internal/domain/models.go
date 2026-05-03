package domain

import "time"

type EventType struct {
	ID              string `json:"id"`
	Title           string `json:"title"`
	Description     string `json:"description"`
	DurationMinutes int    `json:"durationMinutes"`
}

type EventTypeUpdate struct {
	Title           *string `json:"title"`
	Description     *string `json:"description"`
	DurationMinutes *int    `json:"durationMinutes"`
}

type Booking struct {
	ID              string    `json:"id"`
	EventTypeID     string    `json:"eventTypeId"`
	StartAt         time.Time `json:"startAt"`
	EndAt           time.Time `json:"endAt"`
	GuestDisplayName string   `json:"guestDisplayName,omitempty"`
	GuestContact    string    `json:"guestContact,omitempty"`
}

type GuestBookingRequest struct {
	EventTypeID      string    `json:"eventTypeId"`
	StartAt          time.Time `json:"startAt"`
	GuestDisplayName string    `json:"guestDisplayName,omitempty"`
	GuestContact     string    `json:"guestContact,omitempty"`
}

type AvailableSlot struct {
	StartAt time.Time `json:"startAt"`
	EndAt   time.Time `json:"endAt"`
}

type Problem struct {
	Code    string `json:"code,omitempty"`
	Message string `json:"message"`
}
