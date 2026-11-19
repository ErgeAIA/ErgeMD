import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/common/ErrorBoundary";
import "./i18n";
import "./styles/animations.css";
import "./styles/context-menu.css";
import "./styles/globals.css";
import "./styles/markdown.css";
import "katex/dist/katex.min.css";
import { installScrollbarFx } from "./utils/scrollFx";

installScrollbarFx();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
