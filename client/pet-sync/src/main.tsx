import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Agendamento from "./components/Agendamento.tsx";
import FoodBowl from "./components/FoodBowl.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="bg-black min-h-screen">
      <div className="flex">
        <div className="flex-1">
          <Agendamento />
        </div>
        <div className="flex-1">
          <FoodBowl />
        </div>
      </div>
    </div>
  </StrictMode>
);
