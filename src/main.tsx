import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import * as sdk from "./plugins/sdk";

// Expose React and SDK globally so dynamically imported plugins can use them without import maps
(window as any).React = React;
(window as any).WinotchSDK = sdk;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
