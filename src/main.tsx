import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { migrateLocalRoots } from "./lib/migrateRoots";

// 탐색기가 폴더를 읽기 전에 이전 버전 등록 폴더를 허용 목록으로 넘긴다(1회).
void migrateLocalRoots().finally(() => {
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
