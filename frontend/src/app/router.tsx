import { Navigate, Route, Routes } from "react-router-dom";

import { BookingConfirmPage } from "@/pages/booking-confirm";
import { BookingPickPage } from "@/pages/booking-pick";
import { BookingSuccessPage } from "@/pages/booking-success";
import { EventTypesPage } from "@/pages/event-types";
import { HomePage } from "@/pages/home";
import { UpcomingEventsPage } from "@/pages/upcoming-events";

import { MainLayout } from "./layout/main-layout";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="book">
          <Route index element={<EventTypesPage />} />
          <Route path="success" element={<BookingSuccessPage />} />
          <Route path=":eventTypeId" element={<BookingPickPage />} />
          <Route path=":eventTypeId/confirm" element={<BookingConfirmPage />} />
        </Route>
        <Route path="events" element={<UpcomingEventsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
