import { Link } from "react-router-dom";

import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export function BookingSuccessPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-14 md:py-20">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Запись на звонок</h1>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl">Бронь подтверждена. До встречи!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Детали сохранены в мок-хранилище страницы. Позже эту страницу можно подключить к реальному API.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/events">Предстоящие события</Link>
            </Button>
            <Button asChild>
              <Link to="/book">Забронировать ещё</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
