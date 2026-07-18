"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  addPricingRule,
  approveApplication,
  markCommissionsPaid,
  rejectApplication,
  updateInquiryStatus,
  updatePartnerSettings,
} from "@/actions/admin/partners";
import { resolveClaim } from "@/actions/admin/claims";
import { createSupplier, createTestimonial } from "@/actions/admin/catalog";
import type { ActionResult } from "@/actions/admin/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function useRun() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<ActionResult>, successText: string) =>
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        toast.success(successText);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  return { pending, run };
}

export function ApplicationActions({ applicationId }: { applicationId: string }) {
  const { pending, run } = useRun();
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() => {
          const raw = window.prompt(
            "Referral commission % for this partner (0 for none, wholesale-pricing only):",
            "10",
          );
          if (raw === null) return;
          const pct = parseFloat(raw);
          if (Number.isNaN(pct) || pct < 0 || pct > 50) {
            toast.error("Enter a percentage between 0 and 50.");
            return;
          }
          run(
            () =>
              approveApplication(
                applicationId,
                pct > 0 ? Math.round(pct * 100) : null,
              ),
            "Approved, partner created & notified",
          );
        }}
      >
        Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Reject this application?")) return;
          run(() => rejectApplication(applicationId), "Rejected");
        }}
      >
        Reject
      </Button>
    </div>
  );
}

export function InquiryStatusSelect(props: {
  inquiryId: string;
  current: string;
}) {
  const { pending, run } = useRun();
  return (
    <select
      className="h-8 rounded-md border border-input bg-transparent px-2 text-sm capitalize disabled:opacity-50"
      value={props.current}
      disabled={pending}
      onChange={(e) =>
        run(
          () =>
            updateInquiryStatus(
              props.inquiryId,
              e.target.value as "new" | "contacted" | "converted" | "closed",
            ),
          "Status updated",
        )
      }
    >
      {["new", "contacted", "converted", "closed"].map((s) => (
        <option key={s} value={s} className="bg-card capitalize">
          {s}
        </option>
      ))}
    </select>
  );
}

export function ClaimActions({ claimId }: { claimId: string }) {
  const { pending, run } = useRun();
  const act = (
    resolution: "in_review" | "replaced" | "refunded" | "denied",
    label: string,
  ) => {
    const notes = window.prompt(`Notes to the customer (${label}):`, "");
    if (notes === null) return;
    run(() => resolveClaim(claimId, resolution, notes), `Claim ${label}`);
  };
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => act("in_review", "in review")}>
        In review
      </Button>
      <Button size="sm" disabled={pending} onClick={() => act("replaced", "approved, replacement")}>
        Replace
      </Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => act("refunded", "refunded")}>
        Refunded
      </Button>
      <Button size="sm" variant="destructive" disabled={pending} onClick={() => act("denied", "denied")}>
        Deny
      </Button>
    </div>
  );
}

export function PricingRuleForm(props: {
  partnerId: string;
  products: { id: string; name: string }[];
}) {
  const { pending, run } = useRun();
  const [productId, setProductId] = useState(props.products[0]?.id ?? "");
  const [minQty, setMinQty] = useState("10");
  const [price, setPrice] = useState("400");
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <Label className="text-xs">Product</Label>
        <select
          className="mt-1 block h-9 rounded-md border border-input bg-transparent px-2 text-sm"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
        >
          {props.products.map((p) => (
            <option key={p.id} value={p.id} className="bg-card">
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-xs">Min qty</Label>
        <Input className="mt-1 h-9 w-20" type="number" min={1} value={minQty} onChange={(e) => setMinQty(e.target.value)} />
      </div>
      <div>
        <Label className="text-xs">Unit price ($)</Label>
        <Input className="mt-1 h-9 w-24" type="number" min={1} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      <Button
        size="sm"
        disabled={pending || !productId}
        onClick={() => {
          const fd = new FormData();
          fd.set("partnerId", props.partnerId);
          fd.set("productId", productId);
          fd.set("minQty", minQty);
          fd.set("unitPriceCents", String(Math.round(parseFloat(price || "0") * 100)));
          run(() => addPricingRule(fd), "Rule saved");
        }}
      >
        {pending ? "Saving…" : "Add rule"}
      </Button>
    </div>
  );
}

export function PartnerSettingsControls(props: {
  partnerId: string;
  commissionRateBps: number | null;
  status: "approved" | "suspended";
}) {
  const { pending, run } = useRun();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          const raw = window.prompt(
            "Referral commission % (0 to disable):",
            props.commissionRateBps ? String(props.commissionRateBps / 100) : "10",
          );
          if (raw === null) return;
          const pct = parseFloat(raw);
          if (Number.isNaN(pct) || pct < 0 || pct > 50) {
            toast.error("Enter 0–50.");
            return;
          }
          run(
            () =>
              updatePartnerSettings(props.partnerId, {
                commissionRateBps: pct > 0 ? Math.round(pct * 100) : null,
                status: props.status,
              }),
            "Commission updated",
          );
        }}
      >
        Set commission
      </Button>
      <Button
        size="sm"
        variant={props.status === "approved" ? "destructive" : "default"}
        disabled={pending}
        onClick={() => {
          const toStatus = props.status === "approved" ? "suspended" : "approved";
          if (!window.confirm(`${toStatus === "suspended" ? "Suspend" : "Reinstate"} this partner?`)) return;
          run(
            () =>
              updatePartnerSettings(props.partnerId, {
                commissionRateBps: props.commissionRateBps,
                status: toStatus,
              }),
            toStatus === "suspended" ? "Partner suspended" : "Partner reinstated",
          );
        }}
      >
        {props.status === "approved" ? "Suspend" : "Reinstate"}
      </Button>
      <Button
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Mark ALL accrued commissions as paid out?")) return;
          run(() => markCommissionsPaid(props.partnerId), "Commissions settled");
        }}
      >
        Settle commissions
      </Button>
    </div>
  );
}

export function SupplierForm() {
  const { pending, run } = useRun();
  const [open, setOpen] = useState(false);
  if (!open) return <Button onClick={() => setOpen(true)}>Add supplier</Button>;
  return (
    <form
      className="space-y-3 rounded-lg border border-border/60 p-4"
      action={(fd) => {
        run(() => createSupplier(fd), "Supplier added");
        setOpen(false);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label className="text-xs" htmlFor="s-name">Name *</Label>
          <Input id="s-name" name="name" required className="mt-1" />
        </div>
        <div>
          <Label className="text-xs" htmlFor="s-contact">Contact handle</Label>
          <Input id="s-contact" name="contactHandle" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs" htmlFor="s-cost">Default cost (cents)</Label>
          <Input id="s-cost" name="defaultCostCents" type="number" className="mt-1" placeholder="18000" />
        </div>
      </div>
      <div>
        <Label className="text-xs" htmlFor="s-notes">Notes</Label>
        <Textarea id="s-notes" name="notes" rows={2} className="mt-1" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>Save</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}

export function TestimonialForm() {
  const { pending, run } = useRun();
  const [open, setOpen] = useState(false);
  if (!open) return <Button onClick={() => setOpen(true)}>Add testimonial</Button>;
  return (
    <form
      className="space-y-3 rounded-lg border border-border/60 p-4"
      action={(fd) => {
        run(() => createTestimonial(fd), "Testimonial added");
        setOpen(false);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label className="text-xs" htmlFor="t-name">Author *</Label>
          <Input id="t-name" name="authorName" required className="mt-1" />
        </div>
        <div>
          <Label className="text-xs" htmlFor="t-handle">Handle</Label>
          <Input id="t-handle" name="authorHandle" className="mt-1" placeholder="@handle" />
        </div>
        <div>
          <Label className="text-xs" htmlFor="t-rating">Rating (1–5)</Label>
          <Input id="t-rating" name="rating" type="number" min={1} max={5} defaultValue={5} className="mt-1" />
        </div>
      </div>
      <div>
        <Label className="text-xs" htmlFor="t-content">Quote *</Label>
        <Textarea id="t-content" name="content" rows={3} required className="mt-1" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>Save</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
