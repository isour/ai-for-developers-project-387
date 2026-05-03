import { CalendarDays } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import { cn } from "@/shared/lib/utils";

export function AppHeader() {
  const location = useLocation();
  const isBookFlow = location.pathname.startsWith("/book");
  const isEvents = location.pathname.startsWith("/events");

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <NavLink to="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <CalendarDays className="size-7 text-primary" aria-hidden />
          Calendar
        </NavLink>
        <nav className="flex items-center gap-1 text-sm" aria-label="Основная навигация">
          <NavLink
            to="/book"
            className={cn(
              "rounded-md px-3 py-1.5 transition-colors hover:bg-accent",
              isBookFlow && "bg-muted text-foreground font-medium",
            )}
            aria-current={isBookFlow ? "page" : undefined}
          >
            Записаться
          </NavLink>
          <NavLink
            to="/events"
            className={cn(
              "rounded-md px-3 py-1.5 transition-colors hover:bg-accent",
              isEvents && "bg-muted text-foreground font-medium",
            )}
            aria-current={isEvents ? "page" : undefined}
          >
            Предстоящие встречи
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
