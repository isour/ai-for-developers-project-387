# syntax=docker/dockerfile:1

FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Пустой base URL: браузер ходит на тот же хост, что и SPA (Go отдаёт API и статику).
ENV VITE_API_BASE_URL=
RUN npm run build

FROM golang:1.22-alpine AS backend
WORKDIR /app
COPY backend/go.mod ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /server ./cmd/server

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=backend /server ./server
COPY --from=frontend /app/frontend/dist ./static
ENV STATIC_DIR=/app/static
# Render и проверки подставляют PORT; значение по умолчанию для локального docker run.
ENV PORT=8080
EXPOSE 8080
RUN chmod -R a+rX /app/static && chmod a+rx /app/server
USER nobody
CMD ["./server"]
