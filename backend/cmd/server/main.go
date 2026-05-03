package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/hexlet/ai-for-developers-project-386/backend/internal/app"
	"github.com/hexlet/ai-for-developers-project-386/backend/internal/domain"
	httpapi "github.com/hexlet/ai-for-developers-project-386/backend/internal/http"
	"github.com/hexlet/ai-for-developers-project-386/backend/internal/storage/memory"
)

func seedDemoEventTypes(service *app.Service) {
	if os.Getenv("SKIP_DEMO_SEED") == "1" {
		return
	}
	demo := []domain.EventType{
		{
			ID:              "intro-30",
			Title:           "Знакомство",
			Description:     "Короткий созвон, чтобы обсудить задачу и следующие шаги.",
			DurationMinutes: 30,
		},
		{
			ID:              "deep-dive-60",
			Title:           "Разбор подробно",
			Description:     "Час на детальный разбор: архитектура, процессы, вопросы.",
			DurationMinutes: 60,
		},
	}
	for _, et := range demo {
		if _, err := service.CreateEventType(et); err != nil {
			log.Printf("demo seed: %s: %v", et.ID, err)
		}
	}
	log.Printf("demo event types loaded (%d); set SKIP_DEMO_SEED=1 to start with an empty calendar", len(demo))
}

func seedDemoBookings(service *app.Service) {
	if os.Getenv("SKIP_DEMO_SEED") == "1" {
		return
	}
	loc := time.Now().Location()
	day1 := time.Now().In(loc).AddDate(0, 0, 1)
	day2 := time.Now().In(loc).AddDate(0, 0, 2)
	demos := []domain.GuestBookingRequest{
		{
			EventTypeID:      "intro-30",
			StartAt:          time.Date(day1.Year(), day1.Month(), day1.Day(), 10, 0, 0, 0, loc),
			GuestDisplayName: "Демо: Анна",
			GuestContact:     "anna@example.com",
		},
		{
			EventTypeID:      "intro-30",
			StartAt:          time.Date(day1.Year(), day1.Month(), day1.Day(), 15, 0, 0, 0, loc),
			GuestDisplayName: "Демо: Вера",
			GuestContact:     "vera@example.com",
		},
		{
			EventTypeID:      "deep-dive-60",
			StartAt:          time.Date(day2.Year(), day2.Month(), day2.Day(), 14, 0, 0, 0, loc),
			GuestDisplayName: "Демо: Борис",
			GuestContact:     "boris@example.com",
		},
	}
	for _, req := range demos {
		if _, err := service.CreateBooking(req); err != nil {
			log.Printf("demo booking seed: %v", err)
		}
	}
	log.Printf("demo bookings loaded (%d)", len(demos))
}

func main() {
	addr := os.Getenv("BACKEND_ADDR")
	if addr == "" {
		if p := os.Getenv("PORT"); p != "" {
			addr = ":" + p
		} else {
			addr = ":4000"
		}
	}

	staticDir := os.Getenv("STATIC_DIR")

	store := memory.NewStore()
	service := app.NewService(store)
	seedDemoEventTypes(service)
	seedDemoBookings(service)
	handler := httpapi.NewHandler(service, staticDir)

	log.Printf("backend listening on %s (static=%q)", addr, staticDir)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatal(err)
	}
}

