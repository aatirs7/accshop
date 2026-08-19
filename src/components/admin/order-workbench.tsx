"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  advanceOrderStage,
  assignDeliverableSupplier,
  saveAdminNotes,
  type ActionResult,
} from "@/actions/admin/orders";
import { attachCredentials, emailAccountToCustomer } from "@/actions/admin/credentials";
import type { FulfillmentStatus } from "@/lib/orders/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AdvanceStageButton(props: {
  orderId: string;
  to: FulfillmentStatus;
  label: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await advanceOrderStage(props.orderId, props.to);
          if (result.ok) {
            toast.success(`Order advanced to ${props.label}`);
            router.refresh();
          } else {
            toast.error(result.error);
          }
        })
      }
    >
      {pending ? "Working…" : `Advance → ${props.label}`}
    </Button>
  );
}

export function EmailAccountButton({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await emailAccountToCustomer(orderId);
          if (result.ok) {
            toast.success("Account emailed to customer");
            router.refresh();
          } else {
            toast.error(result.error);
          }
        })
      }
    >
      {pending ? "Sending…" : "Email account to customer"}
    </Button>
  );
}

export function AssignSupplierForm(props: {
  deliverableId: string;
  suppliers: { id: string; name: string; defaultCostCents: number | null }[];
  currentSupplierId: string | null;
  currentCostCents: number | null;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [supplierId, setSupplierId] = useState(
    props.currentSupplierId ?? props.suppliers[0]?.id ?? "",
  );
  const selected = props.suppliers.find((s) => s.id === supplierId);
  const [cost, setCost] = useState(
    ((props.currentCostCents ?? selected?.defaultCostCents ?? 18000) / 100).toString(),
  );

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <Label className="text-xs">Supplier</Label>
        <select
          className="mt-1 block h-9 rounded-md border border-input bg-transparent px-2 text-sm"
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
        >
          {props.suppliers.map((s) => (
            <option key={s.id} value={s.id} className="bg-card">
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-xs">Cost paid ($)</Label>
        <Input
          className="mt-1 h-9 w-24"
          type="number"
          min={0}
          step="0.01"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
        />
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={pending || !supplierId}
        onClick={() =>
          startTransition(async () => {
            const fd = new FormData();
            fd.set("deliverableId", props.deliverableId);
            fd.set("supplierId", supplierId);
            fd.set("costCents", String(Math.round(parseFloat(cost || "0") * 100)));
            const result = await assignDeliverableSupplier(fd);
            if (result.ok) {
              toast.success("Supplier & cost saved");
              router.refresh();
            } else {
              toast.error(result.error);
            }
          })
        }
      >
        {pending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

export function AttachCredentialsForm({ deliverableId }: { deliverableId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, fd) => {
      const result = await attachCredentials(prev, fd);
      if (result.ok) {
        toast.success("Credentials encrypted & attached");
        setOpen(false);
        router.refresh();
      }
      return result;
    },
    null,
  );

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        Attach credentials
      </Button>
    );
  }

  return (
    <form
      action={action}
      className="mt-2 space-y-3 rounded-lg border border-brand-gold/30 bg-background p-4"
    >
      <input type="hidden" name="deliverableId" value={deliverableId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs" htmlFor={`u-${deliverableId}`}>TikTok username *</Label>
          <Input id={`u-${deliverableId}`} name="tiktokUsername" required className="mt-1" autoComplete="off" />
        </div>
        <div>
          <Label className="text-xs" htmlFor={`p-${deliverableId}`}>TikTok password *</Label>
          <Input id={`p-${deliverableId}`} name="tiktokPassword" required className="mt-1" autoComplete="off" />
        </div>
        <div>
          <Label className="text-xs" htmlFor={`e-${deliverableId}`}>Linked email</Label>
          <Input id={`e-${deliverableId}`} name="linkedEmail" className="mt-1" autoComplete="off" />
        </div>
        <div>
          <Label className="text-xs" htmlFor={`ep-${deliverableId}`}>Email password</Label>
          <Input id={`ep-${deliverableId}`} name="linkedEmailPassword" className="mt-1" autoComplete="off" />
        </div>
      </div>
      <div>
        <Label className="text-xs" htmlFor={`tfa-${deliverableId}`}>2FA backup codes</Label>
        <Textarea id={`tfa-${deliverableId}`} name="twoFactorCodes" rows={2} className="mt-1" />
      </div>
      <div>
        <Label className="text-xs" htmlFor={`n-${deliverableId}`}>Notes for the buyer</Label>
        <Textarea
          id={`n-${deliverableId}`}
          name="notes"
          rows={2}
          className="mt-1"
          placeholder="e.g. Warm up 5–7 days before posting; account niche: fitness"
        />
      </div>
      {state && !state.ok && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Encrypting…" : "Encrypt & attach"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Stored AES-256-GCM encrypted. After saving, plaintext is never shown
        again, only a fingerprint.
      </p>
    </form>
  );
}

export function AdminNotes(props: { orderId: string; initial: string }) {
  const [notes, setNotes] = useState(props.initial);
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-2">
      <Textarea
        rows={3}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Internal notes (never shown to the customer)"
      />
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await saveAdminNotes(props.orderId, notes);
            if (result.ok) toast.success("Notes saved");
            else toast.error(result.error);
          })
        }
      >
        {pending ? "Saving…" : "Save notes"}
      </Button>
    </div>
  );
}
