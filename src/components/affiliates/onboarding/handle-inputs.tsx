"use client";

import { checkCodeAvailability, checkUsernameAvailability } from "@/actions/affiliates/onboarding";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvailabilityHint, useAvailability } from "./availability";

/** Mirrors normalizeCode on the server; safe to run on every keystroke. */
export function liveCode(raw: string): string {
  return raw.toUpperCase().replace(/\s+/g, "");
}

/** Mirrors normalizeUsername on the server. */
export function liveUsername(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, "").replace(/^@+/, "");
}

export function UsernameInput({
  value,
  onChange,
  id = "username",
  current,
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  /** The affiliate's saved username; no check needed when unchanged. */
  current?: string | null;
}) {
  const { status, schedule, now } = useAvailability(checkUsernameAvailability, {
    skip: (v) => v === current,
  });
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Username</Label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
          @
        </span>
        <Input
          id={id}
          name="username"
          value={value}
          onChange={(e) => {
            const v = liveUsername(e.target.value);
            onChange(v);
            schedule(v);
          }}
          onBlur={() => now(value)}
          className="pl-6"
          required
          minLength={3}
          maxLength={24}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="yourname"
          aria-invalid={status.state === "error" || undefined}
        />
      </div>
      <AvailabilityHint
        status={status}
        okText={`@${value} is available.`}
        idleText="3 to 24 characters: lowercase letters, numbers, dots or underscores."
      />
    </div>
  );
}

export function CodeInput({
  value,
  onChange,
  id = "code",
  current,
  readOnly,
  label = "Your affiliate code",
  hint = "Buyers enter this at checkout. 3 to 20 letters, numbers or dashes.",
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  current?: string | null;
  /** Read-only still submits, unlike disabled. */
  readOnly?: boolean;
  label?: string;
  hint?: string;
}) {
  const { status, schedule, now } = useAvailability(checkCodeAvailability, {
    skip: (v) => v === current,
  });
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name="code"
        value={value}
        onChange={(e) => {
          const v = liveCode(e.target.value);
          onChange(v);
          schedule(v);
        }}
        onBlur={() => now(value)}
        className="font-mono uppercase tracking-wider"
        required
        minLength={3}
        maxLength={20}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        placeholder="MYCODE"
        readOnly={readOnly}
        aria-invalid={status.state === "error" || undefined}
      />
      <AvailabilityHint status={status} okText={`${value} is available.`} idleText={hint} />
    </div>
  );
}
