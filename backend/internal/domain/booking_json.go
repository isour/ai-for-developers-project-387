package domain

import (
	"encoding/json"
	"time"
)

// MarshalJSON фиксирует startAt/endAt как RFC3339 без дробной части секунды —
// так проще и предсказуее парсится в браузере (список «Предстоящие встречи»).
func (b Booking) MarshalJSON() ([]byte, error) {
	type dto struct {
		ID               string `json:"id"`
		EventTypeID      string `json:"eventTypeId"`
		StartAt          string `json:"startAt"`
		EndAt            string `json:"endAt"`
		GuestDisplayName string `json:"guestDisplayName,omitempty"`
		GuestContact     string `json:"guestContact,omitempty"`
	}
	return json.Marshal(dto{
		ID:               b.ID,
		EventTypeID:      b.EventTypeID,
		StartAt:          b.StartAt.Format(time.RFC3339),
		EndAt:            b.EndAt.Format(time.RFC3339),
		GuestDisplayName: b.GuestDisplayName,
		GuestContact:     b.GuestContact,
	})
}
