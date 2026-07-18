import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import PixelMediaGame from "../app/game";
import "../app/game.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PixelMediaGame />
  </StrictMode>,
);
