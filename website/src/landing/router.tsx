import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

import { LandingPage } from "./LandingPage";

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LandingPage,
});

const routeTree = rootRoute.addChildren([indexRoute]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function RootLayout() {
  return (
    <div data-router-provider="tanstack">
      <Outlet />
    </div>
  );
}

export function LandingRouter() {
  if (typeof window === "undefined") {
    return (
      <div data-router-provider="tanstack">
        <LandingPage />
      </div>
    );
  }

  return <RouterProvider router={router} />;
}
