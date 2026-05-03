import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function HomePage() {
  return (
    <div className="bg-gradient-to-br from-blue-50 via-background to-orange-50/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.05fr_minmax(0,0.95fr)] md:items-center md:gap-12 md:py-20">
        <div className="space-y-6">
          <Badge variant="secondary" className="uppercase tracking-wide">
            быстрая запись на звонок
          </Badge>
          <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">Calendar</h1>
          <p className="max-w-prose text-pretty text-muted-foreground md:text-lg">
            Один экран, понятные слоты, быстрая бронь. Выберите время и запишитесь на звонок без лишних шагов.
          </p>
          <Button asChild size="lg" className="gap-2">
            <Link to="/book">
              Записаться
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>

        <Card className="border-border shadow-sm md:rounded-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Что доступно прямо сейчас</CardTitle>
            <CardDescription>На мок-данных, без живого сервера</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>Фиксированные 30‑ и 60‑минутные слоты по рабочему дню (09:00–18:00) в доступном окне.</p>
            <p>При бронировании учитываются занятости всех типов событий (единый календарь).</p>
            <p>Предстоящие встречи можно посмотреть в отдельном разделе.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
