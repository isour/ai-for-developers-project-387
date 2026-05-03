package app

import (
	"errors"
	"time"

	"github.com/hexlet/ai-for-developers-project-386/backend/internal/domain"
	"github.com/hexlet/ai-for-developers-project-386/backend/internal/storage/memory"
)

var (
	ErrBadRequest = errors.New("bad request")
	ErrNotFound   = errors.New("not found")
	ErrConflict   = errors.New("conflict")
	ErrUnprocessable = errors.New("unprocessable entity")
)

type Service struct {
	store *memory.Store
	nowFn func() time.Time
}

func NewService(store *memory.Store) *Service {
	return &Service{
		store: store,
		nowFn: time.Now,
	}
}

func validateDuration(v int) bool {
	return v == 30 || v == 60
}

func (s *Service) ListOwnerEventTypes() []domain.EventType { return s.store.ListEventTypes() }
func (s *Service) ListGuestEventTypes() []domain.EventType { return s.store.ListEventTypes() }

func (s *Service) CreateEventType(et domain.EventType) (domain.EventType, error) {
	if et.ID == "" || et.Title == "" || et.Description == "" || !validateDuration(et.DurationMinutes) {
		return domain.EventType{}, ErrBadRequest
	}
	created, err := s.store.CreateEventType(et)
	if errors.Is(err, memory.ErrEventTypeExists) {
		return domain.EventType{}, ErrConflict
	}
	return created, err
}

func (s *Service) GetEventType(id string) (domain.EventType, error) {
	et, err := s.store.GetEventType(id)
	if errors.Is(err, memory.ErrEventTypeNotFound) {
		return domain.EventType{}, ErrNotFound
	}
	return et, err
}

func (s *Service) UpdateEventType(id string, upd domain.EventTypeUpdate) (domain.EventType, error) {
	if upd.DurationMinutes != nil && !validateDuration(*upd.DurationMinutes) {
		return domain.EventType{}, ErrBadRequest
	}
	et, err := s.store.UpdateEventType(id, upd)
	switch {
	case errors.Is(err, memory.ErrEventTypeNotFound):
		return domain.EventType{}, ErrNotFound
	case errors.Is(err, memory.ErrEventTypeInUse):
		return domain.EventType{}, ErrConflict
	}
	return et, err
}

func (s *Service) DeleteEventType(id string) error {
	err := s.store.DeleteEventType(id)
	switch {
	case errors.Is(err, memory.ErrEventTypeNotFound):
		return ErrNotFound
	case errors.Is(err, memory.ErrEventTypeInUse):
		return ErrConflict
	}
	return err
}

func (s *Service) ListBookings(from, to time.Time) ([]domain.Booking, error) {
	if !from.Before(to) {
		return nil, ErrBadRequest
	}
	return s.store.ListBookings(from, to), nil
}

// guestWindowBoundsIn — границы гостевого окна (полуинтервал [startDay, windowEnd)) в зоне loc.
// «Сегодня» берётся из now, переведённого в loc, чтобы совпадать с календарём браузера при formatISO (локальная полуночь).
func (s *Service) guestWindowBoundsIn(loc *time.Location) (startDay, windowEnd time.Time) {
	if loc == nil {
		loc = time.UTC
	}
	now := s.nowFn()
	y, m, d := now.In(loc).Date()
	startDay = time.Date(y, m, d, 0, 0, 0, 0, loc)
	windowEnd = startDay.AddDate(0, 0, 14)
	return startDay, windowEnd
}

func (s *Service) isInsideBookingWindow(from, to time.Time) bool {
	if !from.Before(to) {
		return false
	}
	startDay, windowEnd := s.guestWindowBoundsIn(from.Location())
	return !from.Before(startDay) && !to.After(windowEnd)
}

// Пересечение [from,to) с гостевым окном — для запросов available-slots за широкий диапазон (месяц в календаре).
func (s *Service) queryOverlapsGuestWindow(from, to time.Time) bool {
	if !from.Before(to) {
		return false
	}
	startDay, windowEnd := s.guestWindowBoundsIn(from.Location())
	return from.Before(windowEnd) && to.After(startDay)
}

func isAligned(slot time.Time, duration int) bool {
	minute := slot.Minute()
	return minute%duration == 0 && slot.Second() == 0 && slot.Nanosecond() == 0
}

func inWorkdayBounds(startAt, endAt time.Time) bool {
	dayStart := time.Date(startAt.Year(), startAt.Month(), startAt.Day(), 9, 0, 0, 0, startAt.Location())
	dayEnd := time.Date(startAt.Year(), startAt.Month(), startAt.Day(), 18, 0, 0, 0, startAt.Location())
	return !startAt.Before(dayStart) && !endAt.After(dayEnd) && startAt.Day() == endAt.Day()
}

func (s *Service) CreateBooking(req domain.GuestBookingRequest) (domain.Booking, error) {
	et, err := s.store.GetEventType(req.EventTypeID)
	if errors.Is(err, memory.ErrEventTypeNotFound) {
		return domain.Booking{}, ErrNotFound
	}
	if err != nil {
		return domain.Booking{}, err
	}
	endAt := req.StartAt.Add(time.Duration(et.DurationMinutes) * time.Minute)
	if !s.isInsideBookingWindow(req.StartAt, endAt) || !inWorkdayBounds(req.StartAt, endAt) || !isAligned(req.StartAt, et.DurationMinutes) {
		return domain.Booking{}, ErrUnprocessable
	}
	created, err := s.store.CreateBooking(req, et)
	if errors.Is(err, memory.ErrSlotBusy) {
		return domain.Booking{}, ErrConflict
	}
	return created, err
}

func (s *Service) ListAvailableSlots(eventTypeID string, from, to time.Time) ([]domain.AvailableSlot, error) {
	et, err := s.store.GetEventType(eventTypeID)
	if errors.Is(err, memory.ErrEventTypeNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if !s.queryOverlapsGuestWindow(from, to) {
		return nil, ErrUnprocessable
	}

	bookings := s.store.ListBookings(from, to)
	duration := time.Duration(et.DurationMinutes) * time.Minute
	slots := make([]domain.AvailableSlot, 0)

	dayCursor := time.Date(from.Year(), from.Month(), from.Day(), 0, 0, 0, 0, from.Location())
	lastDay := time.Date(to.Year(), to.Month(), to.Day(), 0, 0, 0, 0, to.Location())
	for !dayCursor.After(lastDay) {
		workStart := time.Date(dayCursor.Year(), dayCursor.Month(), dayCursor.Day(), 9, 0, 0, 0, dayCursor.Location())
		workEnd := time.Date(dayCursor.Year(), dayCursor.Month(), dayCursor.Day(), 18, 0, 0, 0, dayCursor.Location())
		for slotStart := workStart; slotStart.Before(workEnd); slotStart = slotStart.Add(duration) {
			slotEnd := slotStart.Add(duration)
			if slotEnd.After(workEnd) || slotStart.Before(from) || !slotStart.Before(to) {
				continue
			}
			busy := false
			for _, b := range bookings {
				if slotStart.Before(b.EndAt) && b.StartAt.Before(slotEnd) {
					busy = true
					break
				}
			}
			if busy {
				continue
			}
			if !s.isInsideBookingWindow(slotStart, slotEnd) {
				continue
			}
			slots = append(slots, domain.AvailableSlot{StartAt: slotStart, EndAt: slotEnd})
		}
		dayCursor = dayCursor.AddDate(0, 0, 1)
	}

	return slots, nil
}

