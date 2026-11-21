import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Marker used by the APK/WebView compatibility loader in index.html. It lets
// the shell detect that the module bundle actually executed.
(window as unknown as { __BLOCKREALM_BOOTED?: boolean }).__BLOCKREALM_BOOTED = true;


import "./index.css";
import App from "./App";

const rootEl = document.getElementById("root");
const boot = document.getElementById("boot-screen");
if (boot) boot.remove();

try {
  createRoot(rootEl!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} catch (error) {
  const showError = (window as unknown as { __blockrealmShowError?: (m: string) => void }).__blockrealmShowError;
  if (showError) showError(error instanceof Error ? error.stack ?? error.message : String(error));
}
