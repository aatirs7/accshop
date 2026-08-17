"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// VAPID public keys are base64url; the Push API wants a raw Uint8Array.
function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * Lets the admin turn on/off "new sale" and "new order" push alerts on this
 * device. Hidden if VAPID keys aren't configured yet (see HANDOFF.md), and
 * if the browser doesn't support push (e.g. iOS Safari before the PWA is
 * added to the home screen).
 */
export function AdminPushToggle({
  vapidPublicKey,
}: {
  vapidPublicKey: string | null;
}) {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (cancelled) return;
      setSupported(true);
      setSubscribed(Boolean(existing));
    }
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!vapidPublicKey || !supported) return null;

  async function toggle() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      if (subscribed) {
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          await fetch("/api/admin/push/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: existing.endpoint }),
          });
          await existing.unsubscribe();
        }
        setSubscribed(false);
        toast.success("Sale alerts turned off on this device");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notifications were blocked, enable them in browser settings.");
        return;
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey!),
      });
      await fetch("/api/admin/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      setSubscribed(true);
      toast.success("Sale alerts turned on for this device");
    } catch {
      toast.error("Couldn't update notification settings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={toggle}
      title={subscribed ? "Turn off sale alerts" : "Turn on sale alerts"}
    >
      {subscribed ? <Bell className="text-brand-gold" /> : <BellOff />}
      <span className="hidden sm:inline">
        {subscribed ? "Alerts on" : "Enable alerts"}
      </span>
    </Button>
  );
}
