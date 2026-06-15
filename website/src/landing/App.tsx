import { Analytics } from "@vercel/analytics/react";

import { LandingRouter } from "./router";

export function App() {
  return (
    <>
      <LandingRouter />
      <Analytics />
    </>
  );
}
