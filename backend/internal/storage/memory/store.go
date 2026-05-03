package memory

import (
	"errors"
	"sort"
	"sync"
	"time"

	"github.com/hexlet/ai-for-developers-project-386/backend/internal/domain"
)

var (
	ErrEventTypeExists   = errors.New("event type already exists")
	ErrEventTypeNotFound = errors.New("event type not found")
	ErrEventTypeInUse    = errors.New("event type has bookings")
	ErrSlotBusy          = errors.New("slot is already busy")
)

type Store struct {
	mu       sync.RWMutex
	bookings map[string]domain.Booking
	types    map[string]domain.EventType
	nextID   int
}

func NewStore() *Store {
	return &Store{
		bookings: make(map[string]domain.Booking),
		types:    make(map[string]domain.EventType),
		nextID:   1,
	}
}

func (s *Store) ListEventTypes() []domain.EventType {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]domain.EventType, 0, len(s.types))
	for _, et := range s.types {
		result = append(result, et)
	}
	sort.Slice(result, func(i, j int) bool { return result[i].ID < result[j].ID })
	return result
}

func (s *Store) CreateEventType(et domain.EventType) (domain.EventType, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.types[et.ID]; exists {
		return domain.EventType{}, ErrEventTypeExists
	}
	s.types[et.ID] = et
	return et, nil
}

func (s *Store) GetEventType(id string) (domain.EventType, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	et, ok := s.types[id]
	if !ok {
		return domain.EventType{}, ErrEventTypeNotFound
	}
	return et, nil
}

func (s *Store) UpdateEventType(id string, upd domain.EventTypeUpdate) (domain.EventType, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	et, ok := s.types[id]
	if !ok {
		return domain.EventType{}, ErrEventTypeNotFound
	}
	if upd.Title != nil {
		et.Title = *upd.Title
	}
	if upd.Description != nil {
		et.Description = *upd.Description
	}
	if upd.DurationMinutes != nil {
		for _, b := range s.bookings {
			if b.EventTypeID == id {
				return domain.EventType{}, ErrEventTypeInUse
			}
		}
		et.DurationMinutes = *upd.DurationMinutes
	}
	s.types[id] = et
	return et, nil
}

func (s *Store) DeleteEventType(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.types[id]; !ok {
		return ErrEventTypeNotFound
	}
	for _, b := range s.bookings {
		if b.EventTypeID == id {
			return ErrEventTypeInUse
		}
	}
	delete(s.types, id)
	return nil
}

func intersects(aStart, aEnd, bStart, bEnd time.Time) bool {
	return aStart.Before(bEnd) && bStart.Before(aEnd)
}

func (s *Store) isBusy(startAt, endAt time.Time) bool {
	for _, b := range s.bookings {
		if intersects(startAt, endAt, b.StartAt, b.EndAt) {
			return true
		}
	}
	return false
}

func (s *Store) CreateBooking(req domain.GuestBookingRequest, eventType domain.EventType) (domain.Booking, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	endAt := req.StartAt.Add(time.Duration(eventType.DurationMinutes) * time.Minute)
	if s.isBusy(req.StartAt, endAt) {
		return domain.Booking{}, ErrSlotBusy
	}
	id := s.nextID
	s.nextID++
	booking := domain.Booking{
		ID:               bookingID(id),
		EventTypeID:      req.EventTypeID,
		StartAt:          req.StartAt,
		EndAt:            endAt,
		GuestDisplayName: req.GuestDisplayName,
		GuestContact:     req.GuestContact,
	}
	s.bookings[booking.ID] = booking
	return booking, nil
}

func bookingID(id int) string {
	return "bkg-" + strconvItoa(id)
}

func strconvItoa(v int) string {
	// tiny local helper to avoid exposing fmt.Sprintf in hot path
	if v == 0 {
		return "0"
	}
	buf := [20]byte{}
	i := len(buf)
	n := v
	for n > 0 {
		i--
		buf[i] = byte('0' + (n % 10))
		n /= 10
	}
	return string(buf[i:])
}

func (s *Store) ListBookings(from, to time.Time) []domain.Booking {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]domain.Booking, 0)
	for _, b := range s.bookings {
		if intersects(from, to, b.StartAt, b.EndAt) {
			result = append(result, b)
		}
	}
	sort.Slice(result, func(i, j int) bool { return result[i].StartAt.Before(result[j].StartAt) })
	return result
}

