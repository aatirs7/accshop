"use client";

import { useState } from "react";
import { PAYOUT_METHODS } from "@/lib/affiliates/constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Payout method select + handle input. The select submits as `payoutMethod`
 * (Radix renders a hidden native select) and the handle as `payoutHandle`.
 */
export function PayoutFields({
  defaultMethod,
  defaultHandle,
  idPrefix = "payout",
}: {
  defaultMethod?: string | null;
  defaultHandle?: string | null;
  idPrefix?: string;
}) {
  const known = PAYOUT_METHODS.some((m) => m.value === defaultMethod);
  const [method, setMethod] = useState<string>(known ? (defaultMethod as string) : "");
  const [handle, setHandle] = useState(defaultHandle ?? "");
  const placeholder =
    PAYOUT_METHODS.find((m) => m.value === method)?.placeholder ?? "Choose a payout method first";

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-method`}>Payout method</Label>
        <Select name="payoutMethod" value={method} onValueChange={setMethod} required>
          <SelectTrigger id={`${idPrefix}-method`} className="w-full">
            <SelectValue placeholder="Choose one" />
          </SelectTrigger>
          <SelectContent>
            {PAYOUT_METHODS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-handle`}>Payout handle</Label>
        <Input
          id={`${idPrefix}-handle`}
          name="payoutHandle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder={placeholder}
          required
          maxLength={200}
          autoComplete="off"
        />
      </div>
    </div>
  );
}
