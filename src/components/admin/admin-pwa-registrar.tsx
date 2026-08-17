"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function subscribeToPush(registration: ServiceWorkerRegistration) {
  const res = await fetch("/api/push/vapid-public-key");
  const { publicKey } = await res.json();
  if (!publicKey) return false;

  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  const json = subscription.toJSON();
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });
  return true;
}

/**
 * Registers the admin-only service worker (installable home-screen app) and,
 * once granted, subscribes this device to sale / new-order push alerts.
 * Renders a small opt-in prompt when notifications haven't been granted or
 * denied yet — browsers require a user gesture to ask, so this can't happen
 * silently on load.
 */
export function AdminPwaRegistrar() {
  const [promptVisible, setPromptVisible] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/admin-sw.js", { scope: "/admin" })
      .then(async (registration) => {
        if (!("Notification" in window) || !("PushManager" in window)) return;
        if (Notification.permission === "granted") {
          await subscribeToPush(registration);
        } else if (Notification.permission === "default") {
          setPromptVisible(true);
        }
      })
      .catch(() => {});
  }, []);

  if (!promptVisible) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-4 py-3 shadow-lg sm:inset-x-auto sm:right-4 sm:w-80">
      <p className="text-sm text-muted-foreground">
        Get notified on this device for new orders and sales.
      </p>
      <div className="flex shrink-0 gap-2">
        <Button
          size="sm"
          onClick={async () => {
            setPromptVisible(false);
            const permission = await Notification.requestPermission();
            if (permission !== "granted") return;
            const registration = await navigator.serviceWorker.ready;
            const ok = await subscribeToPush(registration);
            if (ok) toast.success("Notifications enabled");
          }}
        >
          Enable
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setPromptVisible(false)}>
          Not now
        </Button>
      </div>
    </div>
  );
}
