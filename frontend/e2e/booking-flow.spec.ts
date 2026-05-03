import { expect, test, type Page } from "@playwright/test";

function uniqueGuest() {
  const n = Date.now();
  return {
    name: `E2E Гость ${n}`,
    email: `e2e-guest-${n}@example.com`,
  };
}

/** Ключ дня в локальной зоне (как `dayKeyRu` на фронте). */
function localDayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addLocalDays(base: Date, days: number) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days, 12, 0, 0, 0);
  return d;
}

async function clickCalendarNextMonth(page: Page) {
  const nav = page.locator(".booking-calendar-rdp .absolute.inset-x-0.top-0");
  const next = nav.getByRole("button", { name: /Next Month|Следующий/i });
  if (await next.isDisabled()) {
    throw new Error("Кнопка «следующий месяц» недоступна (конец допустимого диапазона календаря)");
  }
  await next.click();
}

/** Открыть день в календаре (при необходимости листнуть месяц вперёд). */
async function openCalendarDay(page: Page, dayKey: string) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const cell = page.locator(`[data-day-key="${dayKey}"]`);
    if (await cell.isVisible().catch(() => false)) {
      await cell.click();
      return;
    }
    await clickCalendarNextMonth(page);
  }
  throw new Error(`Не найден день ${dayKey} в календаре`);
}

/**
 * Выбрать первый свободный слот, у которого конец позже «сейчас» (чтобы бронь попала в «предстоящие»).
 */
async function pickFirstFreeSlotEndingAfter(
  page: Page,
  dayKey: string,
  minEnd: Date,
  slotDurationMinutes: number,
) {
  const buttons = page.locator("button:enabled").filter({ hasText: "Свободно" });
  const n = await buttons.count();
  for (let i = 0; i < n; i++) {
    const btn = buttons.nth(i);
    const rowText = await btn.innerText();
    const m = rowText.match(/(\d{2}):(\d{2})/);
    if (!m) continue;
    const startH = parseInt(m[1], 10);
    const startM = parseInt(m[2], 10);
    const [y, mo, da] = dayKey.split("-").map((x) => parseInt(x, 10));
    const slotStart = new Date(y, mo - 1, da, startH, startM, 0, 0);
    const slotEnd = new Date(slotStart.getTime() + slotDurationMinutes * 60_000);
    if (slotEnd.getTime() > minEnd.getTime()) {
      await btn.click();
      return;
    }
  }
  throw new Error("Нет свободного слота с окончанием позже minEnd на выбранный день");
}

/**
 * Подобрать дату и слот так, чтобы бронь оставалась «предстоящей» при открытии /events после оформления.
 */
async function pickIntro30DayAndSlot(page: Page) {
  const now = new Date();
  const margin = 60_000;
  const minEnd = new Date(now.getTime() + margin);
  const duration = 30;

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    if (dayOffset > 0) {
      await page.goto("/book/intro-30");
    }
    const d = addLocalDays(now, dayOffset);
    const key = localDayKey(d);
    await openCalendarDay(page, key);
    try {
      await pickFirstFreeSlotEndingAfter(page, key, minEnd, duration);
      return;
    } catch {
      /* день не подошёл — пробуем следующий */
    }
  }
  throw new Error("Не удалось найти подходящий слот в 14-дневном окне");
}

async function fillConfirmAndSubmit(page: Page, guest: { name: string; email: string }) {
  await page.locator("#guest-name").fill(guest.name);
  await page.locator("#guest-email").fill(guest.email);
  await page.getByRole("button", { name: "Подтвердить запись" }).click();
}

test.describe.serial("guest booking (integration)", () => {
  test("main flow: pick slot, confirm, see success", async ({ page }) => {
    const guest = uniqueGuest();

    await page.goto("/book/intro-30");
    await expect(page.getByText("Тип:", { exact: false })).toBeVisible();
    await expect(page.getByText("Знакомство")).toBeVisible();

    await pickIntro30DayAndSlot(page);
    await page.getByRole("button", { name: "Продолжить" }).click();

    await expect(page.getByRole("heading", { name: "Подтверждение записи" })).toBeVisible();
    await fillConfirmAndSubmit(page, guest);

    await expect(page.getByText("Бронь подтверждена")).toBeVisible();
  });

  test("booking appears on owner upcoming list", async ({ page }) => {
    const guest = uniqueGuest();

    await page.goto("/book/intro-30");
    await pickIntro30DayAndSlot(page);
    await page.getByRole("button", { name: "Продолжить" }).click();
    await fillConfirmAndSubmit(page, guest);

    await expect(page.getByText("Бронь подтверждена")).toBeVisible();

    await page.goto("/events");
    await expect(page.getByRole("heading", { name: "Предстоящие встречи" })).toBeVisible();
    await expect(page.getByText(guest.name)).toBeVisible();
    await expect(page.getByText(guest.email)).toBeVisible();
  });
});
