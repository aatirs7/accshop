"use client";

import { useState, useTransition } from "react";
import { revealCredential } from "@/actions/reveal";
import type { CredentialPayload } from "@/lib/crypto/credentials";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function CopyButton({ value, label }: { value: string; label: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        toast.success(`${label} copied`);
      }}
    >
      Copy
    </Button>
  );
}

export function RevealPanel({ deliverableId }: { deliverableId: string }) {
  const [payload, setPayload] = useState<CredentialPayload | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (saved) {
    return (
      <p className="text-sm text-brand-success">
        Credentials delivered ✓ — stored on your side. Warranty countdown is
        running.
      </p>
    );
  }

  if (payload) {
    return (
      <div className="space-y-3 rounded-lg border border-brand-gold/40 bg-background p-4">
        <p className="text-sm font-semibold text-brand-warning">
          Save these now — they will not be shown again.
        </p>
        <dl className="space-y-2">
          {payload.fields.map((f) => (
            <div
              key={f.label}
              className="flex items-center justify-between gap-3 rounded-md bg-card px-3 py-2"
            >
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">{f.label}</dt>
                <dd className="truncate font-mono text-sm">{f.value}</dd>
              </div>
              <CopyButton value={f.value} label={f.label} />
            </div>
          ))}
        </dl>
        {payload.notes && (
          <p className="text-xs text-muted-foreground">{payload.notes}</p>
        )}
        <Button className="w-full" onClick={() => setSaved(true)}>
          I&apos;ve saved these securely
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await revealCredential(deliverableId);
            if (result.ok) {
              setPayload(result.payload);
              setError(null);
            } else {
              setError(result.error);
            }
          })
        }
      >
        {pending ? "Decrypting…" : "Reveal credentials"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Shown <strong>once</strong> for security. Have your password manager
        ready before revealing.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
