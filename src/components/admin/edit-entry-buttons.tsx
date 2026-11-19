"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ManualOrderForm, type ManualOrderEntry } from "./manual-order-form";
import { BulkSaleForm, type BulkSaleEntry } from "./bulk-sale-form";

/** "Edit" button that opens the manual-order form pre-filled in a dialog. */
export function EditManualOrderButton({ entry }: { entry: ManualOrderEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Edit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit manual order</DialogTitle>
            <DialogDescription>
              Changes update the revenue numbers at the top.
            </DialogDescription>
          </DialogHeader>
          <ManualOrderForm entry={entry} onSaved={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

/** "Edit" button that opens the bulk-order form pre-filled in a dialog. */
export function EditBulkSaleButton({ entry }: { entry: BulkSaleEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Edit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit bulk order</DialogTitle>
            <DialogDescription>
              Changes update the revenue and profit numbers at the top.
            </DialogDescription>
          </DialogHeader>
          <BulkSaleForm entry={entry} onSaved={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
