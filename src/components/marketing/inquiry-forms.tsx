"use client";

import { useActionState } from "react";
import {
  submitBulkInquiry,
  submitPartnerApplication,
  type FormResult,
} from "@/actions/inquiries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required ? <span className="text-brand-gold"> *</span> : null}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
      />
    </div>
  );
}

function SuccessNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-brand-gold/40 bg-brand-gold/5 p-6 text-center">
      <p className="font-display text-lg text-brand-gold">Received ✓</p>
      <p className="mt-2 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

export function BulkInquiryForm() {
  const [state, action, pending] = useActionState<FormResult | null, FormData>(
    submitBulkInquiry,
    null,
  );
  if (state?.ok) {
    return (
      <SuccessNote>
        We&apos;ll get back to you within 24 hours with volume pricing.
      </SuccessNote>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="name" required />
        <Field label="Email" name="email" type="email" required />
        <Field label="Company / program" name="company" />
        <Field
          label="Accounts needed"
          name="quantityInterest"
          placeholder="e.g. 10–20 per week"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Anything else?</Label>
        <Textarea id="message" name="message" rows={4} />
      </div>
      {state && !state.ok && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Sending…" : "Request bulk pricing"}
      </Button>
    </form>
  );
}

export function PartnerApplicationForm() {
  const [state, action, pending] = useActionState<FormResult | null, FormData>(
    submitPartnerApplication,
    null,
  );
  if (state?.ok) {
    return (
      <SuccessNote>
        Application received. We review every partner personally and reply
        within 24–48 hours.
      </SuccessNote>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="name" required />
        <Field label="Email" name="email" type="email" required />
        <Field
          label="TikTok handle"
          name="tiktokHandle"
          required
          placeholder="@yourhandle"
        />
        <Field label="Other socials" name="otherSocials" />
        <Field
          label="Est. accounts per week"
          name="estWeeklyVolume"
          placeholder="e.g. 10, 20, 50+"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Tell us about your program</Label>
        <Textarea
          id="message"
          name="message"
          rows={4}
          placeholder="Mentorship size, how you'd use accounts, resale vs. referral…"
        />
      </div>
      {state && !state.ok && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Submitting…" : "Apply for partner status"}
      </Button>
    </form>
  );
}
