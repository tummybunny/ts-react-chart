import React from "react";
import ReactDOM from "react-dom/client";
import LineChart from "./LineChart.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <center>
      <div style={{ width: "800px", background: "white" }}>
        <LineChart />
      </div>
    </center>
  </React.StrictMode>
);
