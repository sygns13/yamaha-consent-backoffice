import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { AppProviders } from "./app/providers";
import { createQueryClient } from "./app/queryClient";
import { createAppRouter } from "./app/router";
import { initTheme } from "./lib/theme";
import "./styles/global.css";

initTheme();

// Una sola instancia de cada uno por pestaña (fuera de React, para que StrictMode no los cree dos veces).
const queryClient = createQueryClient();
const router = createAppRouter();

const root = document.getElementById("root");
if (root === null) throw new Error("Falta el elemento #root en index.html.");

createRoot(root).render(
  <StrictMode>
    <AppProviders client={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
