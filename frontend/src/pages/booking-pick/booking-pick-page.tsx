import { addDays, endOfMonth, format, parseISO, startOfDay, startOfMonth, isBefore } from "date-fns";
import { ru } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import type { BookingConfirmLocationState } from "@/shared/model/booking-flow";
import type { EventType, SlotRow } from "@/shared/api/types";
import { guestApi } from "@/shared/api/guest-api";
import { BookingCalendar, dayKeyRu } from "@/shared/ui/booking-calendar";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}

export function BookingPickPage() {
  const { eventTypeId } = useParams();
  const navigate = useNavigate();

  const windowBounds = useMemo(() => guestApi.getGuestWindowBounds(), []);

  const calendarStartMonth = useMemo(() => startOfMonth(windowBounds.from), [windowBounds.from]);
  const calendarEndMonth = useMemo(
    () => startOfMonth(addDays(windowBounds.to, -1)),
    [windowBounds.to],
  );

  const [eventType, setEventType] = useState<EventType | null>(null);
  const [eventTypeLoading, setEventTypeLoading] = useState(true);

  const [month, setMonth] = useState(() => calendarStartMonth);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<SlotRow | null>(null);

  const [availability, setAvailability] = useState<Map<string, number>>(new Map());
  const [rows, setRows] = useState<SlotRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);

  const monthKeys = useMemo(() => {
    const from = startOfMonth(month);
    const to = endOfMonth(month);
    const keys = new Set<string>();
    for (let cur = from; cur <= to; cur = addDays(cur, 1)) {
      keys.add(dayKeyRu(cur));
    }
    return keys;
  }, [month]);

  useEffect(() => {
    if (!eventTypeId) return;
    let alive = true;
    const run = async () => {
      setEventTypeLoading(true);
      const t = await guestApi.getEventTypeById(eventTypeId);
      if (!alive) return;
      setEventType(t);
      setEventTypeLoading(false);
    };
    void run();
    return () => {
      alive = false;
    };
  }, [eventTypeId]);

  useEffect(() => {
    if (!eventTypeId) return;
    let alive = true;
    void guestApi.countAvailableForMonthKeys(eventTypeId, monthKeys).then((map) => {
      if (!alive) return;
      setAvailability(map);
    });
    return () => {
      alive = false;
    };
  }, [eventTypeId, monthKeys]);

  useEffect(() => {
    if (!eventTypeId || !selectedDate) {
      setRows([]);
      return;
    }
    let alive = true;
    setRowsLoading(true);
    void guestApi
      .listSlotRowsForDay(eventTypeId, selectedDate)
      .then((list) => {
        if (!alive) return;
        setRows(list);
      })
      .finally(() => {
        if (!alive) return;
        setRowsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [eventTypeId, selectedDate]);

  if (!eventTypeId) {
    return <Navigate replace to="/book" />;
  }

  if (eventTypeLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:py-10">
        <Skeleton className="h-10 w-full max-w-md rounded-md" />
        <Skeleton className="min-h-[420px] w-full rounded-xl" />
      </div>
    );
  }

  if (!eventType) {
    return <Navigate replace to="/book" />;
  }

  const freeToday = selectedDate ? (availability.get(dayKeyRu(selectedDate)) ?? 0) : null;

  function labelDate() {
    if (!selectedDate) return "Дата не выбрана";
    return format(selectedDate, "EEEE, d MMMM", { locale: ru });
  }

  function labelTime() {
    if (!selectedSlot) return "Время не выбрано";
    return `${format(parseISO(selectedSlot.startAt), "HH:mm")} – ${format(parseISO(selectedSlot.endAt), "HH:mm")}`;
  }

  function durationLabel() {
    if (!selectedDate) return "Нет слотов на этот день";
    const hasRows = rows.length > 0;
    if (!hasRows) return "Нет слотов на этот день";
    return `${eventType.durationMinutes} мин`;
  }

  function onContinue() {
    if (!selectedDate || !selectedSlot) return;
    const state: BookingConfirmLocationState = {
      slotStartIso: selectedSlot.startAt,
      slotEndIso: selectedSlot.endAt,
    };
    navigate(`/book/${eventTypeId}/confirm`, { state });
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Запись на звонок</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Тип: <span className="font-medium text-foreground">{eventType.title}</span>
        </p>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-4">
        <Card className="min-w-0 shadow-sm lg:min-h-[420px]">
          <CardHeader>
            <CardTitle className="text-base">Информация</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <InfoBlock label="Выбранная дата" value={labelDate()} />
            <InfoBlock label="Выбранное время" value={labelTime()} />
            <InfoBlock label="Свободно" value={selectedDate ? String(freeToday ?? 0) : "0"} />
            <InfoBlock label="Длительность слота" value={durationLabel()} />
          </CardContent>
        </Card>

        <Card className="min-w-0 shadow-sm lg:col-span-2 lg:min-h-[420px]">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <CardTitle className="text-base">Календарь</CardTitle>
          </CardHeader>
          <CardContent className="flex w-full min-w-0 justify-center px-2 sm:px-6">
            <BookingCalendar
              mode="single"
              month={month}
              onMonthChange={setMonth}
              startMonth={calendarStartMonth}
              endMonth={calendarEndMonth}
              showOutsideDays={false}
              selected={selectedDate}
              onSelect={(day) => {
                setSelectedDate(day);
                setSelectedSlot(null);
              }}
              availabilityByDayKey={availability}
              disabled={(d) => {
                const day = startOfDay(d);
                return isBefore(day, windowBounds.from) || !isBefore(day, windowBounds.to);
              }}
            />
          </CardContent>
        </Card>

        <Card className="min-w-0 shadow-sm lg:min-h-[420px] lg:flex lg:flex-col">
          <CardHeader>
            <CardTitle className="text-base">Статус слотов</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            {!selectedDate ? (
              <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
                Выберите дату в календаре.
              </div>
            ) : rowsLoading ? (
              <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">Загрузка…</div>
            ) : rows.length === 0 ? (
              <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                На этот день нет слотов.
              </div>
            ) : (
              <ul className="max-h-[320px] flex-1 space-y-2 overflow-auto pr-1">
                {rows.map((row) => {
                  const selected = selectedSlot?.startAt === row.startAt && selectedSlot.endAt === row.endAt;
                  return (
                    <li key={row.startAt}>
                      <button
                        type="button"
                        disabled={!row.available}
                        onClick={() => {
                          if (!row.available) return;
                          setSelectedSlot(row);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md border border-transparent px-3 py-2 text-left text-sm transition-colors",
                          row.available && "hover:bg-muted/80",
                          !row.available && "cursor-not-allowed opacity-60",
                          selected && "border-primary bg-accent",
                        )}
                      >
                        <span>
                          {format(parseISO(row.startAt), "HH:mm")} – {format(parseISO(row.endAt), "HH:mm")}
                        </span>
                        <span className={cn("text-xs font-semibold", row.available ? "text-foreground" : "")}>
                          {row.available ? "Свободно" : "Занято"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-auto flex flex-wrap justify-between gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate("/book")}>
                Назад
              </Button>
              <Button type="button" disabled={!selectedDate || !selectedSlot} onClick={onContinue}>
                Продолжить
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
