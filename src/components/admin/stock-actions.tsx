"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteAccountStock, revealAccountStock } from "@/actions/admin/stock";
import type { CredentialPayload } from "@/lib/crypto/credentials";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";

function CopyButton({ value }: { value: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        toast.success("Copied");
      }}
    >
      Copy
    </Button>
  );
}

export function AccountStockRow({
  stockId,
  supplierName,
  fingerprint,
  addedLabel,
}: {
  stockId: string;
  supplierName: string;
  fingerprint: string | null;
  addedLabel: string;
}) {
  const [payload, setPayload] = useState<CredentialPayload | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <TableRow>
      <TableCell className="font-medium">{supplierName}</TableCell>
      <TableCell className="text-muted-foreground">{fingerprint ?? "-"}</TableCell>
      <TableCell className="text-muted-foreground">{addedLabel}</TableCell>
      <TableCell>
        {payload ? (
          <div className="space-y-1.5 rounded-md bg-card px-3 py-2">
            {payload.fields.map((f) => (
              <div
                key={f.label}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{f.label}</p>
                  <p className="truncate font-mono text-sm">{f.value}</p>
                </div>
                <CopyButton value={f.value} />
              </div>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">•••• hidden</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          {!payload && (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await revealAccountStock(stockId);
                  if (result.ok) setPayload(result.payload);
                  else toast.error(result.error);
                })
              }
            >
              {pending ? "Decrypting…" : "Reveal"}
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("Delete this account from stock?")) return;
              startTransition(async () => {
                const result = await deleteAccountStock(stockId);
                if (result.ok) {
                  toast.success("Deleted");
                  router.refresh();
                } else {
                  toast.error(result.error);
                }
              });
            }}
          >
            Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
