"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Pencil, Trash2, X } from "lucide-react";
import {
  addFulfillment,
  setFulfillmentStatus,
  editFulfillment,
  deleteFulfillment,
} from "@/actions/admin/daily-operations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Status = "pending" | "in_progress" | "fulfilled";
type Fulfillment = {
  id: string;
  opDate: string;
  customerName: string;
  item: string;
  quantity: number | null;
  notes: string | null;
  status: Status;
  fulfilledOn: string | null;
};

const STATUS_LABEL: Record<Status, string> = {
  pending: "Pending",
  in_progress: "In progress",
  fulfilled: "Fulfilled",
};

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function FulfillmentTracker({
  date,
  outstanding,
  completed,
}: {
  date: string;
  outstanding: Fulfillment[];
  completed: Fulfillment[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg?: string) {
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        if (okMsg) toast.success(okMsg);
        router.refresh();
      } else {
        toast.error(r.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>People to Fulfill</CardTitle>
        <span className="text-sm text-muted-foreground">
          {outstanding.length} outstanding
        </span>
      </CardHeader>
      <CardContent className="space-y-5">
        <form
          ref={formRef}
          action={(fd) =>
            startTransition(async () => {
              const r = await addFulfillment(fd);
              if (r.ok) {
                formRef.current?.reset();
                router.refresh();
              } else {
                toast.error(r.error ?? "Could not add the entry.");
              }
            })
          }
          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
        >
          <input type="hidden" name="opDate" value={date} />
          <Input name="customerName" required maxLength={200} placeholder="Customer" />
          <Input name="item" required maxLength={500} placeholder="What to fulfill" />
          <Input name="quantity" type="number" min={1} placeholder="Qty (optional)" />
          <div className="flex gap-2">
            <Input name="notes" maxLength={2000} placeholder="Notes (optional)" className="flex-1" />
            <Button type="submit" size="sm" disabled={pending}>
              Add
            </Button>
          </div>
        </form>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Outstanding
          </p>
          {outstanding.length === 0 ? (
            <p className="py-3 text-center text-sm text-muted-foreground">
              Nothing outstanding. Nice.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {outstanding.map((f) => (
                <FulfillmentRow
                  key={f.id}
                  f={f}
                  date={date}
                  pending={pending}
                  run={run}
                  selectClass={selectClass}
                />
              ))}
            </ul>
          )}
        </div>

        {completed.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Fulfilled today
            </p>
            <ul className="divide-y divide-border/60">
              {completed.map((f) => (
                <li key={f.id} className="flex items-center gap-3 py-2 text-sm">
                  <Check className="h-4 w-4 shrink-0 text-brand-gold" />
                  <span className="min-w-0 flex-1 break-words text-muted-foreground line-through">
                    {f.customerName} — {f.item}
                    {f.quantity ? ` ×${f.quantity}` : ""}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => run(() => setFulfillmentStatus(f.id, "pending", date), "Reopened")}
                  >
                    Reopen
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Delete entry"
                    disabled={pending}
                    onClick={() => run(() => deleteFulfillment(f.id))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FulfillmentRow({
  f,
  date,
  pending,
  run,
  selectClass,
}: {
  f: Fulfillment;
  date: string;
  pending: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg?: string) => void;
  selectClass: string;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(f.customerName);
  const [item, setItem] = useState(f.item);
  const [qty, setQty] = useState(f.quantity?.toString() ?? "");
  const [notes, setNotes] = useState(f.notes ?? "");

  const carried = f.opDate < date;

  if (editing) {
    return (
      <li className="grid gap-2 py-2 sm:grid-cols-2 lg:grid-cols-4">
        <Input value={name} maxLength={200} onChange={(e) => setName(e.target.value)} autoFocus />
        <Input value={item} maxLength={500} onChange={(e) => setItem(e.target.value)} />
        <Input value={qty} type="number" min={1} onChange={(e) => setQty(e.target.value)} placeholder="Qty" />
        <div className="flex gap-2">
          <Input value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" className="flex-1" />
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Save"
            disabled={pending || name.trim() === "" || item.trim() === ""}
            onClick={() =>
              run(() => {
                const q = qty.trim() === "" ? null : Number(qty);
                return editFulfillment({
                  id: f.id,
                  customerName: name.trim(),
                  item: item.trim(),
                  quantity: q && Number.isFinite(q) && q > 0 ? Math.floor(q) : null,
                  notes: notes.trim() || null,
                });
              }, "Saved")
            }
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Cancel"
            onClick={() => {
              setName(f.customerName);
              setItem(f.item);
              setQty(f.quantity?.toString() ?? "");
              setNotes(f.notes ?? "");
              setEditing(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-medium">
          {f.customerName}
          {f.quantity ? <span className="text-muted-foreground"> ×{f.quantity}</span> : null}
          {carried && (
            <span className="ml-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
              carried over
            </span>
          )}
        </p>
        <p className="break-words text-sm text-muted-foreground">{f.item}</p>
        {f.notes && <p className="break-words text-xs text-muted-foreground/80">{f.notes}</p>}
      </div>

      <select
        value={f.status}
        disabled={pending}
        aria-label="Status"
        className={selectClass}
        onChange={(e) => run(() => setFulfillmentStatus(f.id, e.target.value as Status, date))}
      >
        <option value="pending">{STATUS_LABEL.pending}</option>
        <option value="in_progress">{STATUS_LABEL.in_progress}</option>
        <option value="fulfilled">{STATUS_LABEL.fulfilled}</option>
      </select>

      <div className="flex shrink-0 items-center">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Edit entry"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Delete entry"
          disabled={pending}
          onClick={() => run(() => deleteFulfillment(f.id))}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}
