import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Agendamento from "./Agendamento.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Agendamento />
  </StrictMode>
);
