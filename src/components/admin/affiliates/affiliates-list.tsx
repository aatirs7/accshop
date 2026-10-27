"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ChevronRight } from "lucide-react";
import { deleteAffiliates } from "@/actions/admin/affiliates";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { formatDuration } from "@/lib/affiliates/live";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AffiliateStatusBadge } from "./badges";

export interface AffiliateListRow {
  id: string;
  name: string;
  username: string | null;
  email: string;
  code: string;
  status: "active" | "suspended" | "deactivated";
  salesCount: number;
  accountsSold: number;
  lifetimeCents: number;
  pendingCents: number;
  approvedCents: number;
  paidCents: number;
  weekLiveMinutes: number;
  weekLiveSessions: number;
  lastLiveLabel: string | null;
  createdAtMs: number;
}

type SortKey =
  | "lifetimeCents"
  | "salesCount"
  | "pendingCents"
  | "approvedCents"
  | "paidCents"
  | "weekLiveMinutes"
  | "createdAtMs";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "lifetimeCents", label: "Lifetime earned" },
  { key: "salesCount", label: "Sales" },
  { key: "pendingCents", label: "Pending" },
  { key: "approvedCents", label: "Approved" },
  { key: "paidCents", label: "Paid" },
  { key: "weekLiveMinutes", label: "LIVE this week" },
  { key: "createdAtMs", label: "Newest" },
];

const FILTERS = ["all", "active", "suspended", "deactivated"] as const;
type Filter = (typeof FILTERS)[number];

const selectClass =
  "h-8 rounded-md border border-input bg-transparent px-2 text-sm disabled:opacity-50";

function SortHead({
  k,
  sort,
  setSort,
  children,
}: {
  k: SortKey;
  sort: SortKey;
  setSort: (k: SortKey) => void;
  children: React.ReactNode;
}) {
  return (
    <TableHead className="text-right">
      <button
        type="button"
        onClick={() => setSort(k)}
        className={`inline-flex items-center gap-1 hover:text-foreground ${
          sort === k ? "text-foreground" : ""
        }`}
      >
        {children}
        {sort === k && <ArrowDown className="size-3" />}
      </button>
    </TableHead>
  );
}

/** Only profiles with no commission money can be deleted (the server checks too). */
function deletable(r: AffiliateListRow): boolean {
  return r.pendingCents + r.approvedCents + r.paidCents === 0;
}

function SelectBox({
  row,
  checked,
  toggle,
}: {
  row: AffiliateListRow;
  checked: boolean;
  toggle: (id: string) => void;
}) {
  const ok = deletable(row);
  return (
    <input
      type="checkbox"
      className="size-4 accent-brand-gold disabled:opacity-30"
      checked={checked}
      disabled={!ok}
      title={ok ? `Select ${row.name}` : "Has commissions, can't be deleted"}
      aria-label={`Select ${row.name}`}
      onChange={() => toggle(row.id)}
    />
  );
}

export function AffiliatesList({ rows }: { rows: AffiliateListRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<SortKey>("lifetimeCents");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: rows.length, active: 0, suspended: 0, deactivated: 0 };
    for (const r of rows) c[r.status] += 1;
    return c;
  }, [rows]);

  const shown = useMemo(
    () =>
      rows
        .filter((r) => filter === "all" || r.status === filter)
        .sort((a, b) => b[sort] - a[sort] || b.lifetimeCents - a.lifetimeCents),
    [rows, filter, sort],
  );

  const shownDeletable = shown.filter(deletable);
  const allShownSelected =
    shownDeletable.length > 0 && shownDeletable.every((r) => selected.has(r.id));
  const toggleAllShown = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of shownDeletable) {
        if (allShownSelected) next.delete(r.id);
        else next.add(r.id);
      }
      return next;
    });
  const selectedRows = rows.filter((r) => selected.has(r.id));

  const removeSelected = () =>
    startTransition(async () => {
      const result = await deleteAffiliates(selectedRows.map((r) => r.id));
      if (result.ok) {
        const n = result.deleted ?? 0;
        toast.success(
          `Deleted ${n} affiliate${n === 1 ? "" : "s"}` +
            (result.skipped ? `. ${result.skipped} with commissions were kept.` : ""),
        );
        setSelected(new Set());
        setAsking(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });

  return (
    <div className="space-y-4">
      {selectedRows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
          <span className="text-sm">{selectedRows.length} selected</span>
          {asking ? (
            <>
              <span className="text-xs">
                Delete {selectedRows.length} affiliate{selectedRows.length === 1 ? "" : "s"} for
                good?
              </span>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={pending}
                onClick={removeSelected}
              >
                {pending ? "Deleting..." : "Delete"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => setAsking(false)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button type="button" size="sm" variant="destructive" onClick={() => setAsking(true)}>
                Delete selected
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
            </>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Status
          <select
            className={`${selectClass} capitalize`}
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
          >
            {FILTERS.map((f) => (
              <option key={f} value={f} className="bg-card capitalize">
                {f} ({counts[f]})
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Sort by
          <select
            className={selectClass}
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key} className="bg-card">
                {s.label}
              </option>
            ))}
          </select>
        </label>
        {shownDeletable.length > 0 && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground lg:hidden">
            <input
              type="checkbox"
              className="size-4 accent-brand-gold"
              checked={allShownSelected}
              onChange={toggleAllShown}
            />
            Select all without sales
          </label>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {rows.length === 0 ? "No affiliates yet. Share the signup link above." : "No affiliates match this filter."}
        </p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <input
                      type="checkbox"
                      className="size-4 accent-brand-gold disabled:opacity-30"
                      checked={allShownSelected}
                      disabled={shownDeletable.length === 0}
                      title="Select all without sales"
                      aria-label="Select all without sales"
                      onChange={toggleAllShown}
                    />
                  </TableHead>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <SortHead k="salesCount" sort={sort} setSort={setSort}>Sales</SortHead>
                  <SortHead k="lifetimeCents" sort={sort} setSort={setSort}>Lifetime</SortHead>
                  <SortHead k="pendingCents" sort={sort} setSort={setSort}>Pending</SortHead>
                  <SortHead k="approvedCents" sort={sort} setSort={setSort}>Approved</SortHead>
                  <SortHead k="paidCents" sort={sort} setSort={setSort}>Paid</SortHead>
                  <SortHead k="weekLiveMinutes" sort={sort} setSort={setSort}>LIVE this week</SortHead>
                  <TableHead className="text-right">Last LIVE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <SelectBox row={r} checked={selected.has(r.id)} toggle={toggle} />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/affiliates/${r.id}`}
                        className="font-medium hover:text-brand-gold"
                      >
                        {r.name}
                      </Link>
                      {r.username && (
                        <span className="ml-2 text-xs text-muted-foreground">@{r.username}</span>
                      )}
                      <span className="block text-xs text-muted-foreground">{r.email}</span>
                    </TableCell>
                    <TableCell className="font-mono text-brand-gold">{r.code}</TableCell>
                    <TableCell>
                      <AffiliateStatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {r.salesCount}
                      <span className="block text-xs text-muted-foreground">
                        {r.accountsSold} acct{r.accountsSold === 1 ? "" : "s"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatMoney(r.lifetimeCents)}</TableCell>
                    <TableCell className="text-right text-brand-warning">{formatMoney(r.pendingCents)}</TableCell>
                    <TableCell className="text-right text-brand-gold">{formatMoney(r.approvedCents)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatMoney(r.paidCents)}</TableCell>
                    <TableCell className="text-right">
                      {formatDuration(r.weekLiveMinutes)}
                      <span className="block text-xs text-muted-foreground">
                        {r.weekLiveSessions} session{r.weekLiveSessions === 1 ? "" : "s"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {r.lastLiveLabel ?? "Never"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile and tablet cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
            {shown.map((r) => (
              <div key={r.id} className="relative">
                <div className="absolute left-4 top-4 z-10">
                  <SelectBox row={r} checked={selected.has(r.id)} toggle={toggle} />
                </div>
                <Link
                  href={`/admin/affiliates/${r.id}`}
                  className="block rounded-lg border border-border/60 p-4 pl-11 transition-colors hover:border-brand-gold/40"
                >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {r.name}
                      {r.username && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">@{r.username}</span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-mono text-sm text-brand-gold">{r.code}</span>
                  <AffiliateStatusBadge status={r.status} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <dt className="text-muted-foreground">Sales</dt>
                  <dd className="text-right">
                    {r.salesCount} ({r.accountsSold} acct{r.accountsSold === 1 ? "" : "s"})
                  </dd>
                  <dt className="text-muted-foreground">Lifetime</dt>
                  <dd className="text-right font-medium">{formatMoney(r.lifetimeCents)}</dd>
                  <dt className="text-muted-foreground">Pending</dt>
                  <dd className="text-right text-brand-warning">{formatMoney(r.pendingCents)}</dd>
                  <dt className="text-muted-foreground">Approved</dt>
                  <dd className="text-right text-brand-gold">{formatMoney(r.approvedCents)}</dd>
                  <dt className="text-muted-foreground">Paid</dt>
                  <dd className="text-right">{formatMoney(r.paidCents)}</dd>
                  <dt className="text-muted-foreground">LIVE this week</dt>
                  <dd className="text-right">
                    {formatDuration(r.weekLiveMinutes)} / {r.weekLiveSessions} session{r.weekLiveSessions === 1 ? "" : "s"}
                  </dd>
                  <dt className="text-muted-foreground">Last LIVE</dt>
                  <dd className="text-right">{r.lastLiveLabel ?? "Never"}</dd>
                </dl>
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
