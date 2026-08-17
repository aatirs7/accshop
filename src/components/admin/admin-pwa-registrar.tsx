"use client";

import { useEffect } from "react";

// Registers the admin-only service worker so the CRM can be added to a
// phone's home screen as a standalone app. Scoped to /admin so it never
// touches the storefront or checkout.
export function AdminPwaRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/admin-sw.js", { scope: "/admin" })
        .catch(() => {});
    }
  }, []);

  return null;
}
