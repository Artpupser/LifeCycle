import { AnimationProvider } from "@/systems/animations/animation-provider";
import {QueryClientProvider} from "@tanstack/react-query";
import {queryClient} from "@/systems/loading/cache";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import "./index.css";

if(import.meta.env.DEV&&import.meta.env.VITE_MOCK_API==="true")await (await import("./testing/browser")).startMockApi();

createRoot(document.getElementById("root")!).render(<StrictMode><QueryClientProvider client={queryClient}><AnimationProvider><App /></AnimationProvider></QueryClientProvider></StrictMode>);
