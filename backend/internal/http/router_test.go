package httpapi

import (
	"bytes"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"github.com/hexlet/ai-for-developers-project-386/backend/internal/app"
	"github.com/hexlet/ai-for-developers-project-386/backend/internal/domain"
	"github.com/hexlet/ai-for-developers-project-386/backend/internal/storage/memory"
)

func setupHandler(t *testing.T) http.Handler {
	t.Helper()
	store := memory.NewStore()
	svc := app.NewService(store)
	svc.CreateEventType(domain.EventType{
		ID:              "intro-30",
		Title:           "Intro",
		Description:     "Intro call",
		DurationMinutes: 30,
	})
	return NewHandler(svc, "")
}

func TestGuestBookingConflictReturns409(t *testing.T) {
	handler := setupHandler(t)
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), now.Day(), 10, 0, 0, 0, now.Location()).AddDate(0, 0, 1)
	payload := []byte(fmt.Sprintf(`{"eventTypeId":"intro-30","startAt":"%s"}`, start.Format(time.RFC3339)))

	req1 := httptest.NewRequest(http.MethodPost, "/guest/bookings", bytes.NewReader(payload))
	rec1 := httptest.NewRecorder()
	handler.ServeHTTP(rec1, req1)

	req2 := httptest.NewRequest(http.MethodPost, "/guest/bookings", bytes.NewReader(payload))
	rec2 := httptest.NewRecorder()
	handler.ServeHTTP(rec2, req2)

	if rec2.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d", rec2.Code)
	}
}

func TestOwnerBookingsEndpoint(t *testing.T) {
	handler := setupHandler(t)
	now := time.Now()
	day := now.AddDate(0, 0, 1)
	from := time.Date(day.Year(), day.Month(), day.Day(), 9, 0, 0, 0, day.Location()).Format(time.RFC3339)
	to := time.Date(day.Year(), day.Month(), day.Day(), 12, 0, 0, 0, day.Location()).Format(time.RFC3339)

	q := url.Values{}
	q.Set("from", from)
	q.Set("to", to)
	req := httptest.NewRequest(http.MethodGet, "/owner/bookings?"+q.Encode(), nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

