package app

import (
	"testing"
	"time"

	"github.com/hexlet/ai-for-developers-project-386/backend/internal/domain"
	"github.com/hexlet/ai-for-developers-project-386/backend/internal/storage/memory"
)

func fixedNow() time.Time {
	return time.Date(2026, 5, 1, 8, 0, 0, 0, time.UTC)
}

func newServiceForTests(t *testing.T) *Service {
	t.Helper()
	store := memory.NewStore()
	svc := NewService(store)
	svc.nowFn = fixedNow

	_, err := svc.CreateEventType(domain.EventType{
		ID:              "intro-30",
		Title:           "Intro",
		Description:     "Intro call",
		DurationMinutes: 30,
	})
	if err != nil {
		t.Fatalf("failed to create event type: %v", err)
	}
	return svc
}

func TestCreateBookingConflict(t *testing.T) {
	svc := newServiceForTests(t)
	start := time.Date(2026, 5, 2, 10, 0, 0, 0, time.UTC)

	_, err := svc.CreateBooking(domain.GuestBookingRequest{
		EventTypeID: "intro-30",
		StartAt:     start,
	})
	if err != nil {
		t.Fatalf("expected first booking to succeed, got %v", err)
	}

	_, err = svc.CreateBooking(domain.GuestBookingRequest{
		EventTypeID: "intro-30",
		StartAt:     start,
	})
	if err != ErrConflict {
		t.Fatalf("expected ErrConflict, got %v", err)
	}
}

func TestCreateBookingOutsideWindow(t *testing.T) {
	svc := newServiceForTests(t)
	start := time.Date(2026, 5, 20, 10, 0, 0, 0, time.UTC)

	_, err := svc.CreateBooking(domain.GuestBookingRequest{
		EventTypeID: "intro-30",
		StartAt:     start,
	})
	if err != ErrUnprocessable {
		t.Fatalf("expected ErrUnprocessable, got %v", err)
	}
}

func TestListAvailableSlotsExcludesBusySlots(t *testing.T) {
	svc := newServiceForTests(t)
	from := time.Date(2026, 5, 2, 9, 0, 0, 0, time.UTC)
	to := time.Date(2026, 5, 2, 12, 0, 0, 0, time.UTC)

	_, err := svc.CreateBooking(domain.GuestBookingRequest{
		EventTypeID: "intro-30",
		StartAt:     time.Date(2026, 5, 2, 10, 0, 0, 0, time.UTC),
	})
	if err != nil {
		t.Fatalf("expected booking creation, got %v", err)
	}

	slots, err := svc.ListAvailableSlots("intro-30", from, to)
	if err != nil {
		t.Fatalf("expected slots list, got %v", err)
	}
	for _, slot := range slots {
		if slot.StartAt.Equal(time.Date(2026, 5, 2, 10, 0, 0, 0, time.UTC)) {
			t.Fatalf("busy slot should be excluded")
		}
	}
}

