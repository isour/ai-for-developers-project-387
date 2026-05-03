import { Outlet } from "react-router-dom";

import { AppHeader } from "@/widgets/app-header";

export function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <div className="flex-1 bg-muted/40">
        <Outlet />
      </div>
    </div>
  );
}
