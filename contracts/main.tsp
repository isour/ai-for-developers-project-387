/** HTTP API календаря звонков: **REST** поверх HTTP — коллекции и экземпляры по существительным, глаголы через методы HTTP. Админ: `/owner/...`, гость: `/guest/...`. */
import "@typespec/http";
import "@typespec/openapi";
import "@typespec/rest";

using TypeSpec.Http;
using TypeSpec.OpenAPI;
using TypeSpec.Rest;

@service(#{
  title: "Календарь звонков API",
})
@OpenAPI.tagMetadata(
  "owner",
  #{ description: "Админская часть: типы событий и список бронирований.", },
)
@OpenAPI.tagMetadata(
  "guest",
  #{ description: "Публичные операции без входа в систему.", },
)
@OpenAPI.info(#{
  version: "1.0.0",
  summary: """
    Без регистрации и авторизации по учётным записям. Владелец — один профиль админской части;
    гость бронирует слот публично. Окно гостевой записи по умолчанию — 14 дней от текущей даты;
    два бронирования не могут пересекаться по времени, даже при разных типах событий.
    Слоты строятся по рабочему дню **09:00–18:00**; длительность встречи — **30 или 60 минут** (шаг сетки совпадает с длительностью типа).
    Стиль: **REST** (ресурсы, множественное число в путях коллекций, при необходимости субресурсы).
    Привязка маршрутов описана через **@typespec/http** совместно с библиотекой **@typespec/rest** (общие соглашения и расширяемость).
    """,
})
@server("https://localhost", "Пример локального сервера")
namespace CallCalendar {

/** Детали ошибки в теле ответа. */
model Problem {
  /** Краткий код причины (по желанию стабильное имя приложения). */
  code?: string;

  /** Пояснение для человека или клиента. */
  message: string;
}

@error
model NotFound {
  @statusCode _: 404;
  ...Problem;
}

@error
model Conflict {
  @statusCode _: 409;
  ...Problem;
}

@error
model Unprocessable {
  @statusCode _: 422;
  ...Problem;
}

@error
model BadRequest {
  @statusCode _: 400;
  ...Problem;
}

/** Допустимая длительность встречи: 30 или 60 минут (сетка рабочего дня 09:00–18:00). */
alias SlotDurationMinutes = 30 | 60;

/** Тип события (шаблон встречи), задаётся владельцем. */
@TypeSpec.example(#{
  id: "intro-30",
  title: "Знакомство, 30 минут",
  description: "Короткий созвон: цели, контекст, следующие шаги.",
  durationMinutes: 30,
})
model EventType {
  /** Стабильный идентификатор (напр. slug или UUID строкой). */
  id: string;

  title: string;
  description: string;

  /** Длительность в минутах; совпадает с шагом сетки слотов (30 или 60). */
  durationMinutes: SlotDurationMinutes;
}

model EventTypeCreate {
  id: string;
  title: string;
  description: string;

  durationMinutes: SlotDurationMinutes;
}

model EventTypeUpdate {
  title?: string;
  description?: string;

  /** При смене длительности реализации следует решить судьбу существующих бронирований. */
  durationMinutes?: SlotDurationMinutes;
}

/** Интервал свободного слота `[startAt, endAt)`. */
@TypeSpec.example(#{
  startAt: utcDateTime.fromISO("2026-05-15T09:00:00+03:00"),
  endAt: utcDateTime.fromISO("2026-05-15T09:30:00+03:00"),
})
model AvailableSlot {
  startAt: utcDateTime;
  endAt: utcDateTime;
}

/** Подтверждённое бронирование. */
@TypeSpec.example(#{
  id: "bkg-mock-1",
  eventTypeId: "intro-30",
  startAt: utcDateTime.fromISO("2026-05-12T10:00:00+03:00"),
  endAt: utcDateTime.fromISO("2026-05-12T10:30:00+03:00"),
  guestDisplayName: "Анна Петрова",
  guestContact: "anna@example.com",
})
model Booking {
  id: string;
  eventTypeId: string;
  startAt: utcDateTime;
  endAt: utcDateTime;

  /** Необязательная метка гостя (имя, как обращаться на созвоне). */
  guestDisplayName?: string;

  /** Необязательный контакт — без верификации аккаунта. */
  guestContact?: string;
}

model GuestBookingRequest {
  eventTypeId: string;

  /** Начало брони; конец выводится как startAt + durationMinutes типа (проверка на сервере). */
  startAt: utcDateTime;

  guestDisplayName?: string;
  guestContact?: string;
}

@route("/owner/event-types")
@tag("owner")
interface OwnerEventTypes {
  /** Список всех типов событий. */
  @get
  @TypeSpec.opExample(#{
    returnType: #[
      #{ id: "intro-30", title: "Знакомство, 30 минут", description: "Короткий созвон: цели, контекст, следующие шаги.", durationMinutes: 30 },
      #{ id: "deep-dive-60", title: "Рабочая сессия, 60 минут", description: "Разбор задачи, демонстрация, фиксация договорённостей.", durationMinutes: 60 },
    ],
  })
  list(): EventType[];

  /** Создать тип события (`POST` по коллекции). */
  @post
  create(@body body: EventTypeCreate): EventType | Conflict | BadRequest;
}

/** Один ресурс типа события. */
@route("/owner/event-types/{eventTypeId}")
@tag("owner")
interface OwnerEventTypeResource {
  @get
  get(@path eventTypeId: string): EventType | NotFound;

  @patch
  update(@path eventTypeId: string, @body body: EventTypeUpdate): EventType | NotFound | Conflict;

  @delete
  remove(@path eventTypeId: string): void | NotFound | Conflict;
}

@route("/owner/bookings")
@tag("owner")
interface OwnerBookings {
  /** Бронирования всех типов в окне времени `[from, to)`. */
  @get
  @TypeSpec.opExample(#{
    parameters: #{
      from: utcDateTime.fromISO("2026-04-30T00:00:00+03:00"),
      to: utcDateTime.fromISO("2027-04-30T00:00:00+03:00"),
    },
    returnType: #[
      #{
        id: "bkg-mock-1",
        eventTypeId: "intro-30",
        startAt: utcDateTime.fromISO("2026-05-07T10:00:00+03:00"),
        endAt: utcDateTime.fromISO("2026-05-07T10:30:00+03:00"),
        guestDisplayName: "Анна Петрова",
        guestContact: "anna@example.com",
      },
      #{
        id: "bkg-mock-2",
        eventTypeId: "deep-dive-60",
        startAt: utcDateTime.fromISO("2026-05-08T14:00:00+03:00"),
        endAt: utcDateTime.fromISO("2026-05-08T15:00:00+03:00"),
        guestDisplayName: "Иван Смирнов",
        guestContact: "ivan.smirnov@example.com",
      },
      #{
        id: "bkg-mock-3",
        eventTypeId: "intro-30",
        startAt: utcDateTime.fromISO("2026-05-12T11:30:00+03:00"),
        endAt: utcDateTime.fromISO("2026-05-12T12:00:00+03:00"),
        guestDisplayName: "Ольга Климова",
        guestContact: "+7 900 555-12-34",
      },
      #{
        id: "bkg-mock-4",
        eventTypeId: "deep-dive-60",
        startAt: utcDateTime.fromISO("2026-05-20T09:00:00+03:00"),
        endAt: utcDateTime.fromISO("2026-05-20T10:00:00+03:00"),
        guestDisplayName: "Демо без контакта",
      },
    ],
  })
  list(
    /** Начало окна (UTC). */
    @query from: utcDateTime,
    /** Конец окна (UTC), не включается. */
    @query to: utcDateTime,
  ): Booking[] | BadRequest;
}

@route("/guest/event-types")
@tag("guest")
interface GuestEventTypes {
  /** Карточки типов событий для выбора бронирования. */
  @get
  @TypeSpec.opExample(#{
    returnType: #[
      #{ id: "intro-30", title: "Знакомство, 30 минут", description: "Короткий созвон: цели, контекст, следующие шаги.", durationMinutes: 30 },
      #{ id: "deep-dive-60", title: "Рабочая сессия, 60 минут", description: "Разбор задачи, демонстрация, фиксация договорённостей.", durationMinutes: 60 },
    ],
  })
  list(): EventType[];
}

/** Субресурс доступных интервалов внутри типа события. */
@route("/guest/event-types/{eventTypeId}/available-slots")
@tag("guest")
interface GuestSlots {
  /**
   * Свободные слоты для типа события на полуинтервале `[from, to)`.
   * Запросы вне гостевого окна (14 дней от «сегодня» на сервере) — `422`.
   */
  @get
  @TypeSpec.opExample(#{
    parameters: #{
      eventTypeId: "intro-30",
      from: utcDateTime.fromISO("2026-05-15T00:00:00+03:00"),
      to: utcDateTime.fromISO("2026-05-16T00:00:00+03:00"),
    },
    returnType: #[
      #{ startAt: utcDateTime.fromISO("2026-05-15T09:00:00+03:00"), endAt: utcDateTime.fromISO("2026-05-15T09:30:00+03:00") },
      #{ startAt: utcDateTime.fromISO("2026-05-15T09:30:00+03:00"), endAt: utcDateTime.fromISO("2026-05-15T10:00:00+03:00") },
      #{ startAt: utcDateTime.fromISO("2026-05-15T10:00:00+03:00"), endAt: utcDateTime.fromISO("2026-05-15T10:30:00+03:00") },
      #{ startAt: utcDateTime.fromISO("2026-05-15T10:30:00+03:00"), endAt: utcDateTime.fromISO("2026-05-15T11:00:00+03:00") },
      #{ startAt: utcDateTime.fromISO("2026-05-15T11:00:00+03:00"), endAt: utcDateTime.fromISO("2026-05-15T11:30:00+03:00") },
      #{ startAt: utcDateTime.fromISO("2026-05-15T11:30:00+03:00"), endAt: utcDateTime.fromISO("2026-05-15T12:00:00+03:00") },
      #{ startAt: utcDateTime.fromISO("2026-05-15T12:00:00+03:00"), endAt: utcDateTime.fromISO("2026-05-15T12:30:00+03:00") },
      #{ startAt: utcDateTime.fromISO("2026-05-15T12:30:00+03:00"), endAt: utcDateTime.fromISO("2026-05-15T13:00:00+03:00") },
      #{ startAt: utcDateTime.fromISO("2026-05-15T13:00:00+03:00"), endAt: utcDateTime.fromISO("2026-05-15T13:30:00+03:00") },
      #{ startAt: utcDateTime.fromISO("2026-05-15T13:30:00+03:00"), endAt: utcDateTime.fromISO("2026-05-15T14:00:00+03:00") },
      #{ startAt: utcDateTime.fromISO("2026-05-15T14:00:00+03:00"), endAt: utcDateTime.fromISO("2026-05-15T14:30:00+03:00") },
      #{ startAt: utcDateTime.fromISO("2026-05-15T14:30:00+03:00"), endAt: utcDateTime.fromISO("2026-05-15T15:00:00+03:00") },
      #{ startAt: utcDateTime.fromISO("2026-05-15T15:00:00+03:00"), endAt: utcDateTime.fromISO("2026-05-15T15:30:00+03:00") },
      #{ startAt: utcDateTime.fromISO("2026-05-15T15:30:00+03:00"), endAt: utcDateTime.fromISO("2026-05-15T16:00:00+03:00") },
      #{ startAt: utcDateTime.fromISO("2026-05-15T16:00:00+03:00"), endAt: utcDateTime.fromISO("2026-05-15T16:30:00+03:00") },
      #{ startAt: utcDateTime.fromISO("2026-05-15T16:30:00+03:00"), endAt: utcDateTime.fromISO("2026-05-15T17:00:00+03:00") },
      #{ startAt: utcDateTime.fromISO("2026-05-15T17:00:00+03:00"), endAt: utcDateTime.fromISO("2026-05-15T17:30:00+03:00") },
      #{ startAt: utcDateTime.fromISO("2026-05-15T17:30:00+03:00"), endAt: utcDateTime.fromISO("2026-05-15T18:00:00+03:00") },
    ],
  })
  list(
    @path eventTypeId: string,
    @query from: utcDateTime,
    @query to: utcDateTime,
  ): AvailableSlot[] | NotFound | Unprocessable | BadRequest;
}

@route("/guest/bookings")
@tag("guest")
interface GuestBookings {
  /** Создать бронирование на свободный слот. */
  @post
  create(@body body: GuestBookingRequest): Booking | Conflict | Unprocessable | NotFound | BadRequest;
}
}
