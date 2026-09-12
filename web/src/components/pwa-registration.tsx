"use client";

import { useEffect } from "react";

export default function PwaRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    function registerWorker() {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // A aplicação continua funcional no navegador quando a instalação não é suportada.
      });
    }

    if (document.readyState === "complete") registerWorker();
    else window.addEventListener("load", registerWorker, { once: true });

    return () => window.removeEventListener("load", registerWorker);
  }, []);

  return null;
}
