"use client";

import { useEffect } from "react";

export function PwaServiceWorker() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      let registration: ServiceWorkerRegistration | null = null;
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((reg) => {
          registration = reg;
          reg.update().catch(() => {});
        })
        .catch(() => {});

      const handleFocus = () => {
        registration?.update().catch(() => {});
      };
      window.addEventListener("focus", handleFocus);
      return () => {
        window.removeEventListener("focus", handleFocus);
      };
    }
  }, []);

  return null;
}
