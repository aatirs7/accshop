"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <code className="flex-1 truncate rounded-md border border-border/60 bg-background px-3 py-2 font-mono text-sm text-brand-gold">
          {value}
        </code>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            toast.success("Copied");
          }}
        >
          Copy
        </Button>
      </div>
    </div>
  );
}
