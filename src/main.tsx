import React from "react";
import ReactDOM from "react-dom/client";
import "maplibre-gl/dist/maplibre-gl.css";
import "./styles/app.css";
import { App } from "./App";
import { ObjectsProvider } from "./state/objectsStore";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ObjectsProvider>
      <App />
    </ObjectsProvider>
  </React.StrictMode>,
);

