import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { WorkforceProvider } from "@/features/workforce/WorkforceProvider";
import { App } from "./App";
import "@/styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WorkforceProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
          <Toaster richColors position="top-right" />
        </WorkforceProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
