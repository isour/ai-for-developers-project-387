import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { useEffect, useState } from "react";

import type { Booking } from "@/shared/api/types";
import { guestApi } from "@/shared/api/guest-api";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";

export function UpcomingEventsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Booking[]>([]);
  const [typeTitleById, setTypeTitleById] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    void Promise.all([guestApi.listEventTypes(), guestApi.listUpcomingBookings()]).then(([types, list]) => {
      if (!alive) return;
      const titles: Record<string, string> = {};
      for (const t of types) {
        titles[t.id] = t.title;
      }
      setTypeTitleById(titles);
      setItems(list);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 md:py-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Предстоящие встречи</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Сценарий владельца календаря: все предстоящие бронирования по каждому типу события в одном списке.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Пока нет предстоящих встреч в календаре.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((b) => {
            const start = parseISO(b.startAt);
            const slotText = `${format(start, "yyyy-MM-dd HH:mm")} – ${format(parseISO(b.endAt), "HH:mm")}`;
            return (
              <Card key={b.id} className="shadow-sm">
                <CardHeader className="pb-2">
                  <div className="text-base font-semibold">
                    {b.guestDisplayName?.trim() || `Гость (${b.eventTypeId})`}
                  </div>
                  {b.guestContact?.trim() ? (
                    <div className="text-sm text-muted-foreground">{b.guestContact}</div>
                  ) : (
                    <div className="text-sm italic text-muted-foreground">контакт не указан</div>
                  )}
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Тип встречи: </span>
                    <span className="font-medium">{typeTitleById[b.eventTypeId] ?? b.eventTypeId}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Слот: </span>
                    <span className="font-medium">{slotText}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Начало: </span>
                    <span>{format(start, "d MMMM yyyy, HH:mm", { locale: ru })}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
