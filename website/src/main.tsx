import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

import { App } from "./landing/App";

import "./styles/landing.css";
import "./styles/landing-workflow.css";
import "./styles/landing-local-path.css";
import "./styles/landing-mobile.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("DiagramPilot landing root element is missing.");
}

hydrateRoot(
  root,
  <StrictMode>
    <App />
  </StrictMode>,
);
