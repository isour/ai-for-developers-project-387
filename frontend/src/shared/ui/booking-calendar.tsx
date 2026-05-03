import * as React from "react";

import {
  DayButton,
  type ChevronProps,
  type DayButtonProps,
  DayPicker,
  getDefaultClassNames,
} from "react-day-picker";
import { ru } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { dayKeyRu } from "@/shared/lib/calendar-day-key";
import { cn } from "@/shared/lib/utils";

export { dayKeyRu } from "@/shared/lib/calendar-day-key";

export type BookingCalendarProps = React.ComponentProps<typeof DayPicker> & {
  availabilityByDayKey?: Map<string, number>;
};

export function BookingCalendar({
  className,
  classNames,
  showOutsideDays = true,
  availabilityByDayKey,
  components,
  ...props
}: BookingCalendarProps) {
  const defaults = getDefaultClassNames();

  const availability = availabilityByDayKey;

  return (
    <DayPicker
      {...props}
      locale={ru}
      showOutsideDays={showOutsideDays}
      captionLayout="label"
      className={cn("rounded-md border border-border bg-card p-3", props.className, className)}
      classNames={{
        root: cn("booking-calendar-rdp w-full max-w-full min-w-0", defaults.root),
        months: cn("relative flex w-full !max-w-full min-w-0 gap-16 flex-col sm:flex-row", defaults.months),
        month: cn("flex w-full flex-col gap-4", defaults.month),
        caption_label: cn("text-sm font-medium capitalize", defaults.caption_label),
        nav: cn("absolute inset-x-0 top-0 flex w-full items-center justify-between", defaults.nav),
        button_previous: cn("size-9 opacity-70 hover:opacity-100 [&_svg]:size-5", defaults.button_previous),
        button_next: cn("size-9 opacity-70 hover:opacity-100 [&_svg]:size-5", defaults.button_next),
        month_caption: cn("relative mx-14 mb-1 flex items-center justify-center capitalize", defaults.month_caption),
        weekdays: cn("flex", defaults.weekdays),
        weekday: cn(
          "flex-1 select-none rounded-md text-[0.78rem] font-medium text-muted-foreground",
          defaults.weekday,
        ),
        week: cn("mt-3 flex w-full", defaults.week),
        day: cn("group relative flex-1 px-0 text-center size-11 p-0", defaults.day),
        day_button: cn("size-full min-h-[52px]", defaults.day_button),
        selected: cn("border-primary text-primary [&_svg]:text-primary [&_svg]:opacity-90", defaults.selected),
        today: cn("bg-accent font-semibold", defaults.today),
        outside: cn("text-muted-foreground opacity-50", defaults.outside),
        disabled: cn("opacity-25", defaults.disabled),
        hidden: cn("invisible flex-1", defaults.hidden),
        ...props.classNames,
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chClass, ...rest }: ChevronProps) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
          return <Icon className={cn("size-4", chClass)} {...rest} />;
        },
        DayButton: (btnProps: DayButtonProps) => {
          const { day, modifiers, className: btnClassName, ...rest } = btnProps;
          const key = dayKeyRu(day.date);
          const count = availability?.get(key);
          return (
            <DayButton
              {...rest}
              day={day}
              modifiers={modifiers}
              data-day-key={key}
              data-testid={modifiers.today ? "calendar-day-today" : undefined}
              className={cn(
                "relative flex aspect-square h-auto w-full min-h-[52px] flex-col justify-center rounded-md px-px py-0.5 hover:bg-accent",
                modifiers.selected && "border-2 border-primary py-px",
                btnClassName,
              )}
            >
              <span className="text-sm font-semibold">{day.date.getDate()}</span>
              {!modifiers.outside && availability !== undefined ? (
                <span className="text-[10px] text-muted-foreground">{count ?? 0} св.</span>
              ) : null}
            </DayButton>
          );
        },
        ...components,
      }}
    />
  );
}
