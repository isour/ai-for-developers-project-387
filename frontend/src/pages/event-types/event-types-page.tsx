import { useEffect, useState } from "react";

import type { EventType } from "@/shared/api/types";
import { guestApi } from "@/shared/api/guest-api";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { Button } from "@/shared/ui/button";
import { Link } from "react-router-dom";

export function EventTypesPage() {
  const [loading, setLoading] = useState(true);
  const [types, setTypes] = useState<EventType[]>([]);

  useEffect(() => {
    let alive = true;
    void guestApi.listEventTypes().then((items) => {
      if (!alive) return;
      setTypes(items);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Запись на звонок</h1>
        <p className="mt-2 text-muted-foreground">Выберите тип встречи — откроется календарь и свободные слоты.</p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : types.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">Нет типов встреч</CardTitle>
            <CardDescription>
              Календарь пуст: в API ещё не создано ни одного типа события. В демо-бэкенде при старте подставляются
              примеры; если включён <code className="rounded bg-muted px-1 text-xs">SKIP_DEMO_SEED=1</code>, добавьте
              типы запросом <code className="rounded bg-muted px-1 text-xs">POST /owner/event-types</code> (см.
              OpenAPI).
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {types.map((t) => (
            <Card key={t.id} className="flex flex-col shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-lg">{t.title}</CardTitle>
                  <Badge variant="secondary">{t.durationMinutes} мин</Badge>
                </div>
                <CardDescription className="text-sm leading-relaxed">{t.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1" />
              <CardFooter className="border-t pt-4">
                <Button asChild className="w-full">
                  <Link to={`/book/${t.id}`}>Выбрать</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
