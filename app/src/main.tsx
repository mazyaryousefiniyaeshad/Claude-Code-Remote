import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import { readFontScale, readTheme } from "./lib/storage";
import "antd-mobile/es/global";
import "./styles/tokens.css";
import "./styles/base.css";

const root = document.documentElement;
root.dataset.theme =
  readTheme() ?? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
root.style.setProperty("--t-body", `${readFontScale()}px`);

const client = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 5000 },
  },
});

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
