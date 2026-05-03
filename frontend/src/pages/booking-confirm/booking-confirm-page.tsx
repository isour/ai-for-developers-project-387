import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { type FormEvent, useEffect, useState } from "react";
import { Link, Navigate, NavLink, useLocation, useNavigate, useParams } from "react-router-dom";

import type { BookingConfirmLocationState } from "@/shared/model/booking-flow";
import type { EventType } from "@/shared/api/types";
import { bookingConfirmFormSchema } from "@/shared/lib/booking-confirm-schema";
import { cn } from "@/shared/lib/utils";
import { guestApi } from "@/shared/api/guest-api";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}

export function BookingConfirmPage() {
  const { eventTypeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as BookingConfirmLocationState | undefined;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [freeForDay, setFreeForDay] = useState(0);

  useEffect(() => {
    setError(null);
    setFieldErrors({});
    if (!(state?.slotStartIso && state.slotEndIso) && eventTypeId) {
      navigate(`/book/${eventTypeId}`, { replace: true });
    }
  }, [eventTypeId, navigate, state?.slotEndIso, state?.slotStartIso]);

  useEffect(() => {
    if (!eventTypeId || !state?.slotStartIso) return;
    let alive = true;
    setDetailLoading(true);
    const start = parseISO(state.slotStartIso);
    void Promise.all([
      guestApi.getEventTypeById(eventTypeId),
      guestApi.countFreeSlotsOnDay(eventTypeId, start),
    ]).then(([type, n]) => {
      if (!alive) return;
      setEventType(type);
      setFreeForDay(n);
      setDetailLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [eventTypeId, state?.slotStartIso]);

  if (!eventTypeId) {
    return <Navigate replace to="/book" />;
  }

  if (!state?.slotStartIso || !state.slotEndIso) {
    return null;
  }

  const start = parseISO(state.slotStartIso);

  if (detailLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:py-10">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!eventType) {
    return <Navigate replace to="/book" />;
  }

  const slotLabel = `${format(start, "HH:mm")} – ${format(parseISO(state.slotEndIso), "HH:mm")}`;
  const dateLabel = format(start, "EEEE, d MMMM", { locale: ru });
  const durationLabel = `${eventType.durationMinutes} мин`;

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    const parsed = bookingConfirmFormSchema.safeParse({
      guestDisplayName: name,
      guestContact: email,
    });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        name: f.guestDisplayName?.[0],
        email: f.guestContact?.[0],
      });
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await guestApi.createBooking({
        eventTypeId,
        startAt: state.slotStartIso,
        guestDisplayName: parsed.data.guestDisplayName,
        guestContact: parsed.data.guestContact,
      });
      navigate("/book/success", { replace: true });
    } catch {
      setError(
        "Не удалось подтвердить запись. Возможен конфликт слота или выход за допустимое окно записи.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Запись на звонок</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:items-stretch">
        <Card className="shadow-sm md:h-full md:rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">Информация</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <InfoBlock label="Выбранная дата" value={dateLabel} />
            <InfoBlock label="Выбранное время" value={slotLabel} />
            <InfoBlock label="Свободно" value={String(freeForDay)} />
            <InfoBlock label="Длительность слота" value={durationLabel} />
          </CardContent>
        </Card>

        <Card className="shadow-sm md:h-full md:rounded-xl">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <CardTitle className="text-base">Подтверждение записи</CardTitle>
            <Button asChild variant="outline" size="sm">
              <NavLink to={`/book/${eventTypeId}`}>Изменить</NavLink>
            </Button>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="guest-name">Имя</Label>
                <Input
                  id="guest-name"
                  name="guestDisplayName"
                  autoComplete="name"
                  placeholder="Как к вам обращаться"
                  value={name}
                  aria-invalid={fieldErrors.name ? true : undefined}
                  aria-describedby={fieldErrors.name ? "guest-name-error" : undefined}
                  className={cn(fieldErrors.name && "border-destructive focus-visible:ring-destructive")}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                />
                {fieldErrors.name ? (
                  <p id="guest-name-error" className="text-sm text-destructive">
                    {fieldErrors.name}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest-email">Email</Label>
                <Input
                  id="guest-email"
                  name="guestContact"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  aria-invalid={fieldErrors.email ? true : undefined}
                  aria-describedby={fieldErrors.email ? "guest-email-error" : undefined}
                  className={cn(fieldErrors.email && "border-destructive focus-visible:ring-destructive")}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                />
                {fieldErrors.email ? (
                  <p id="guest-email-error" className="text-sm text-destructive">
                    {fieldErrors.email}
                  </p>
                ) : null}
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <Button type="submit" className="w-full" disabled={submitting}>
                Подтвердить запись
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Button asChild variant="link" className="px-0 text-muted-foreground">
        <Link to="/events">Предстоящие события</Link>
      </Button>
    </div>
  );
}
