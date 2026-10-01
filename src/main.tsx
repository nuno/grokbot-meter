import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { getTheme } from "./lib/prefs";
import { applyTheme } from "./lib/themes";

// Before render — the popup must never paint a frame in the wrong theme.
if (typeof navigator !== "undefined" && /Windows NT/.test(navigator.userAgent)) {
  document.documentElement.dataset.platform = "win32";
}
applyTheme(getTheme());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
