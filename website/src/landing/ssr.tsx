import { renderToString } from "react-dom/server";

import { App } from "./App";

import "../styles/landing.css";
import "../styles/landing-workflow.css";
import "../styles/landing-local-path.css";
import "../styles/landing-mobile.css";

export function renderLandingPage() {
  return renderToString(<App />);
}
