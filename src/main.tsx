import React from "react";
import ReactDOM from "react-dom/client";
import Example from "./Example.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <center>
      <div style={{ width: "800px", background: "white" }}>
        <Example />
      </div>
    </center>
  </React.StrictMode>
);
