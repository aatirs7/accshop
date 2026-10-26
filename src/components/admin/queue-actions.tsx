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
import {
  approveSubmission,
  createSupplier,
  createTestimonial,
  deleteStockAccount,
  rejectSubmission,
  resetSupplierAccessLink,
  toggleSupplierActive,
  updateSupplier,
  updateTestimonial,
} from "@/actions/admin/catalog";
import { setTestimonialFlags, deleteTestimonial } from "@/actions/admin/catalog";
import type { ActionResult } from "@/actions/admin/orders";
import { ActionButton } from "@/components/admin/action-button";
import { CopyField } from "@/components/dashboard/copy-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";

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

export function SubmissionActions({ submissionId }: { submissionId: string }) {
  const { pending, run } = useRun();
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          run(() => approveSubmission(submissionId), "Published")
        }
      >
        Approve &amp; publish
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Reject this submission?")) return;
          run(() => rejectSubmission(submissionId), "Rejected");
        }}
      >
        Reject
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
      <div className="grid gap-3 sm:grid-cols-4">
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
        <div>
          <Label className="text-xs" htmlFor="t-date">Date</Label>
          <Input id="t-date" name="createdAt" type="date" className="mt-1" />
        </div>
      </div>
      <div>
        <Label className="text-xs" htmlFor="t-content">Quote *</Label>
        <Textarea id="t-content" name="content" rows={3} required className="mt-1" />
      </div>
      <div>
        <Label className="text-xs" htmlFor="t-image">Photo (optional)</Label>
        <input
          id="t-image"
          name="image"
          type="file"
          accept="image/*"
          className="mt-1 block text-xs file:mr-3 file:rounded-md file:border-0 file:bg-brand-gold file:px-3 file:py-1.5 file:text-[oklch(0.17_0.02_85)]"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>Save</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}

export interface SupplierRowData {
  id: string;
  name: string;
  contactHandle: string | null;
  defaultCostCents: number | null;
  notes: string | null;
  active: boolean;
}

export function SupplierRow({
  supplier,
  fulfilled,
  avgCostLabel,
  totalPaidLabel,
  accessUrl,
}: {
  supplier: SupplierRowData;
  fulfilled: number;
  avgCostLabel: string;
  totalPaidLabel: string;
  /** Full URL to this supplier's "add accounts" page, or null if none generated yet. */
  accessUrl: string | null;
}) {
  const { pending, run } = useRun();
  const [editing, setEditing] = useState(false);
  const [showLink, setShowLink] = useState(false);

  if (editing) {
    return (
      <TableRow>
        <TableCell colSpan={7}>
          <form
            className="space-y-3 py-2"
            action={(fd) => {
              run(() => updateSupplier(fd), "Supplier updated");
              setEditing(false);
            }}
          >
            <input type="hidden" name="supplierId" value={supplier.id} />
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label className="text-xs">Name *</Label>
                <Input name="name" defaultValue={supplier.name} required className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Contact handle</Label>
                <Input name="contactHandle" defaultValue={supplier.contactHandle ?? ""} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Default cost (cents)</Label>
                <Input
                  name="defaultCostCents"
                  type="number"
                  defaultValue={supplier.defaultCostCents ?? ""}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea name="notes" rows={2} defaultValue={supplier.notes ?? ""} className="mt-1" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={pending}>Save</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </form>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">{supplier.name}</TableCell>
        <TableCell className="text-muted-foreground">{supplier.contactHandle ?? "-"}</TableCell>
        <TableCell className="text-right">{fulfilled}</TableCell>
        <TableCell className="text-right">{avgCostLabel}</TableCell>
        <TableCell className="text-right">{totalPaidLabel}</TableCell>
        <TableCell>
          <Badge variant="outline">{supplier.active ? "Active" : "Inactive"}</Badge>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowLink((v) => !v)}>
              {showLink ? "Hide link" : "Accounts link"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <ActionButton
              action={toggleSupplierActive.bind(null, supplier.id, !supplier.active)}
              successText={supplier.active ? "Deactivated" : "Activated"}
            >
              {supplier.active ? "Deactivate" : "Activate"}
            </ActionButton>
          </div>
        </TableCell>
      </TableRow>
      {showLink && (
        <TableRow>
          <TableCell colSpan={7}>
            <div className="py-2">
              {accessUrl ? (
                <CopyField label="Send this link to your supplier to add accounts" value={accessUrl} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No accounts link yet.
                </p>
              )}
              <div className="mt-2">
                <ActionButton
                  variant="ghost"
                  action={() => resetSupplierAccessLink(supplier.id)}
                  successText="Link ready"
                >
                  {accessUrl ? "Generate a new link" : "Generate link"}
                </ActionButton>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export interface TestimonialItemData {
  id: string;
  authorName: string;
  authorHandle: string | null;
  content: string;
  rating: number;
  published: boolean;
  featured: boolean;
  createdAt: Date;
  imageUrl: string | null;
}

export function TestimonialAdminItem({
  testimonial: t,
}: {
  testimonial: TestimonialItemData;
}) {
  const { pending, run } = useRun();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <Card>
        <CardContent className="pt-6">
          <form
            className="space-y-3"
            action={(fd) => {
              run(() => updateTestimonial(fd), "Testimonial updated");
              setEditing(false);
            }}
          >
            <input type="hidden" name="id" value={t.id} />
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <Label className="text-xs">Author *</Label>
                <Input name="authorName" defaultValue={t.authorName} required className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Handle</Label>
                <Input name="authorHandle" defaultValue={t.authorHandle ?? ""} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Rating (1–5)</Label>
                <Input name="rating" type="number" min={1} max={5} defaultValue={t.rating} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Date</Label>
                <Input
                  name="createdAt"
                  type="date"
                  defaultValue={t.createdAt.toISOString().slice(0, 10)}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Quote *</Label>
              <Textarea name="content" rows={3} defaultValue={t.content} required className="mt-1" />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {t.imageUrl && (
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.imageUrl}
                    alt=""
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input type="checkbox" name="removeImage" className="accent-[oklch(0.83_0.115_85)]" />
                    Remove photo
                  </label>
                </div>
              )}
              <div>
                <Label className="text-xs">{t.imageUrl ? "Replace photo" : "Photo (optional)"}</Label>
                <input
                  name="image"
                  type="file"
                  accept="image/*"
                  className="mt-1 block text-xs file:mr-3 file:rounded-md file:border-0 file:bg-brand-gold file:px-3 file:py-1.5 file:text-[oklch(0.17_0.02_85)]"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={pending}>Save</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex max-w-2xl gap-3">
            {t.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={t.imageUrl}
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg object-cover"
              />
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{t.authorName}</p>
                {t.authorHandle && (
                  <span className="text-sm text-muted-foreground">{t.authorHandle}</span>
                )}
                <span className="text-brand-gold">{"★".repeat(t.rating)}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(t.createdAt)}
                </span>
                {t.published ? (
                  <Badge variant="outline" className="border-brand-success/50 text-brand-success">
                    Published
                  </Badge>
                ) : (
                  <Badge variant="outline">Hidden</Badge>
                )}
                {t.featured && (
                  <Badge variant="outline" className="border-brand-gold/40 text-brand-gold">
                    Featured
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{t.content}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={pending} onClick={() => setEditing(true)}>
              Edit
            </Button>
            <ActionButton
              action={setTestimonialFlags.bind(null, t.id, { published: !t.published })}
              successText={t.published ? "Hidden" : "Published"}
            >
              {t.published ? "Hide" : "Publish"}
            </ActionButton>
            <ActionButton
              action={setTestimonialFlags.bind(null, t.id, { featured: !t.featured })}
              successText="Updated"
            >
              {t.featured ? "Unfeature" : "Feature"}
            </ActionButton>
            <ActionButton
              action={deleteTestimonial.bind(null, t.id)}
              variant="destructive"
              confirmText="Delete this testimonial permanently?"
              successText="Deleted"
            >
              Delete
            </ActionButton>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StockAccountRow({
  id,
  productName,
  supplierName,
  fingerprint,
  addedLabel,
  used,
}: {
  id: string;
  productName: string;
  supplierName: string;
  fingerprint: string | null;
  addedLabel: string;
  used: boolean;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{productName}</TableCell>
      <TableCell className="text-muted-foreground">{supplierName}</TableCell>
      <TableCell className="text-muted-foreground">{fingerprint ?? "-"}</TableCell>
      <TableCell className="text-muted-foreground">{addedLabel}</TableCell>
      <TableCell>
        <Badge variant="outline">{used ? "Assigned" : "In stock"}</Badge>
      </TableCell>
      <TableCell className="text-right">
        {!used && (
          <ActionButton
            action={deleteStockAccount.bind(null, id)}
            variant="destructive"
            confirmText="Remove this account from stock?"
            successText="Removed"
          >
            Delete
          </ActionButton>
        )}
      </TableCell>
    </TableRow>
  );
}
