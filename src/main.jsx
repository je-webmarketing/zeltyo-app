import React from "react";
import ReactDOM from "react-dom/client";
import AppLive from "./AppLive.jsx";
import AppDemo from "./AppDemo.jsx";

const mode = "demo"; // mets "live" pour la version opérationnelle

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {mode === "demo" ? <AppDemo /> : <AppLive />}
  </React.StrictMode>
);