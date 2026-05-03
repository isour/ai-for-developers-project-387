package httpapi

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/hexlet/ai-for-developers-project-386/backend/internal/app"
	"github.com/hexlet/ai-for-developers-project-386/backend/internal/domain"
)

type API struct {
	service *app.Service
}

func NewHandler(service *app.Service, staticDir string) http.Handler {
	api := &API{service: service}
	mux := http.NewServeMux()

	mux.HandleFunc("/owner/event-types", api.handleOwnerEventTypes)
	mux.HandleFunc("/owner/event-types/", api.handleOwnerEventTypeByID)
	mux.HandleFunc("/owner/bookings", api.handleOwnerBookings)
	mux.HandleFunc("/guest/event-types", api.handleGuestEventTypes)
	mux.HandleFunc("/guest/event-types/", api.handleGuestEventTypeSubresources)
	mux.HandleFunc("/guest/bookings", api.handleGuestBookings)

	apiChain := withJSONContentType(withCORS(mux))
	if staticDir == "" {
		return apiChain
	}

	spa := spaFileHandler(staticDir)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := r.URL.Path
		if strings.HasPrefix(p, "/guest") || strings.HasPrefix(p, "/owner") {
			apiChain.ServeHTTP(w, r)
			return
		}
		spa.ServeHTTP(w, r)
	})
}

func spaFileHandler(staticDir string) http.Handler {
	base, err := filepath.Abs(staticDir)
	if err != nil {
		panic("spaFileHandler: staticDir: " + err.Error())
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			http.NotFound(w, r)
			return
		}
		rel := strings.TrimPrefix(filepath.Clean(r.URL.Path), "/")
		if rel == "." {
			rel = ""
		}
		index := filepath.Join(base, "index.html")
		if rel == "" {
			http.ServeFile(w, r, index)
			return
		}
		full := filepath.Clean(filepath.Join(base, rel))
		if full != base && !strings.HasPrefix(full, base+string(filepath.Separator)) {
			http.NotFound(w, r)
			return
		}
		fi, err := os.Stat(full)
		if err != nil || fi.IsDir() {
			http.ServeFile(w, r, index)
			return
		}
		http.ServeFile(w, r, full)
	})
}

func withJSONContentType(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		next.ServeHTTP(w, r)
	})
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeProblem(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, domain.Problem{Code: code, Message: message})
}

func decodeJSON(r *http.Request, target any) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(target)
}

func parseDateTime(raw string) (time.Time, error) {
	if t, err := time.Parse(time.RFC3339, raw); err == nil {
		return t, nil
	}
	return time.Parse(time.RFC3339Nano, raw)
}

func mapError(w http.ResponseWriter, err error) bool {
	switch err {
	case app.ErrBadRequest:
		writeProblem(w, http.StatusBadRequest, "bad_request", "invalid request data")
	case app.ErrNotFound:
		writeProblem(w, http.StatusNotFound, "not_found", "resource not found")
	case app.ErrConflict:
		writeProblem(w, http.StatusConflict, "conflict", "request conflicts with current state")
	case app.ErrUnprocessable:
		writeProblem(w, http.StatusUnprocessableEntity, "unprocessable_entity", "business rules validation failed")
	default:
		return false
	}
	return true
}

func (a *API) handleOwnerEventTypes(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		writeJSON(w, http.StatusOK, a.service.ListOwnerEventTypes())
	case http.MethodPost:
		var req domain.EventType
		if err := decodeJSON(r, &req); err != nil {
			writeProblem(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
			return
		}
		created, err := a.service.CreateEventType(req)
		if err != nil && mapError(w, err) {
			return
		}
		writeJSON(w, http.StatusOK, created)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (a *API) handleOwnerEventTypeByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/owner/event-types/")
	if id == "" || strings.Contains(id, "/") {
		writeProblem(w, http.StatusNotFound, "not_found", "resource not found")
		return
	}

	switch r.Method {
	case http.MethodGet:
		et, err := a.service.GetEventType(id)
		if err != nil && mapError(w, err) {
			return
		}
		writeJSON(w, http.StatusOK, et)
	case http.MethodPatch:
		var req domain.EventTypeUpdate
		if err := decodeJSON(r, &req); err != nil {
			writeProblem(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
			return
		}
		updated, err := a.service.UpdateEventType(id, req)
		if err != nil && mapError(w, err) {
			return
		}
		writeJSON(w, http.StatusOK, updated)
	case http.MethodDelete:
		err := a.service.DeleteEventType(id)
		if err != nil && mapError(w, err) {
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (a *API) handleOwnerBookings(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	from, err := parseDateTime(r.URL.Query().Get("from"))
	if err != nil {
		writeProblem(w, http.StatusBadRequest, "bad_request", "invalid from")
		return
	}
	to, err := parseDateTime(r.URL.Query().Get("to"))
	if err != nil {
		writeProblem(w, http.StatusBadRequest, "bad_request", "invalid to")
		return
	}
	result, appErr := a.service.ListBookings(from, to)
	if appErr != nil && mapError(w, appErr) {
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (a *API) handleGuestEventTypes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	writeJSON(w, http.StatusOK, a.service.ListGuestEventTypes())
}

func (a *API) handleGuestEventTypeSubresources(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	rest := strings.TrimPrefix(r.URL.Path, "/guest/event-types/")
	parts := strings.Split(rest, "/")
	if len(parts) != 2 || parts[1] != "available-slots" || parts[0] == "" {
		writeProblem(w, http.StatusNotFound, "not_found", "resource not found")
		return
	}
	from, err := parseDateTime(r.URL.Query().Get("from"))
	if err != nil {
		writeProblem(w, http.StatusBadRequest, "bad_request", "invalid from")
		return
	}
	to, err := parseDateTime(r.URL.Query().Get("to"))
	if err != nil {
		writeProblem(w, http.StatusBadRequest, "bad_request", "invalid to")
		return
	}
	slots, appErr := a.service.ListAvailableSlots(parts[0], from, to)
	if appErr != nil && mapError(w, appErr) {
		return
	}
	writeJSON(w, http.StatusOK, slots)
}

func (a *API) handleGuestBookings(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req domain.GuestBookingRequest
	if err := decodeJSON(r, &req); err != nil {
		writeProblem(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.EventTypeID == "" || req.StartAt.IsZero() {
		writeProblem(w, http.StatusBadRequest, "bad_request", "eventTypeId and startAt are required")
		return
	}

	booking, err := a.service.CreateBooking(req)
	if err != nil && mapError(w, err) {
		return
	}
	writeJSON(w, http.StatusOK, booking)
}

