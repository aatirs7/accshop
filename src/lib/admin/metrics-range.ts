/**
 * Shared parsing for the admin overview's metrics window. The picker
 * (client) writes `range`, `from`, `to` into the URL; the overview page
 * (server) reads them back with `parseMetricsRange`.
 *
 * Preset windows are computed in the browser so "today" means the shop
 * owner's local day, not the server's UTC day. Timestamps travel as
 * milliseconds since epoch; `to` is exclusive.
 */

export const METRICS_PRESETS = ["today", "7d", "30d", "all", "custom"] as const;
export type MetricsPreset = (typeof METRICS_PRESETS)[number];

export type MetricsRange = {
  preset: MetricsPreset;
  from?: Date;
  to?: Date;
  /** Local YYYY-MM-DD values, only present for custom ranges. */
  fromDay?: string;
  toDay?: string;
};

const DAY_MS = 86_400_000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseTs(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? new Date(n) : undefined;
}

type Params = Record<string, string | string[] | undefined>;

function single(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

/**
 * Default (no params) is the rolling 30 days the overview always showed.
 * If a preset arrives without usable timestamps (hand-typed URL, old
 * bookmark) we fall back to a server-side rolling window so the page never
 * errors.
 */
export function parseMetricsRange(params: Params): MetricsRange {
  const preset = single(params.range);
  const from = parseTs(single(params.from));
  const to = parseTs(single(params.to));
  const now = Date.now();

  switch (preset) {
    case "today":
      return { preset, from: from ?? new Date(now - DAY_MS), to };
    case "7d":
      return { preset, from: from ?? new Date(now - 7 * DAY_MS), to };
    case "all":
      return { preset };
    case "custom": {
      const fromDay = single(params.fromDay);
      const toDay = single(params.toDay);
      if (from || to) {
        return {
          preset,
          from,
          to,
          fromDay: fromDay && DAY_RE.test(fromDay) ? fromDay : undefined,
          toDay: toDay && DAY_RE.test(toDay) ? toDay : undefined,
        };
      }
      return { preset: "30d", from: new Date(now - 30 * DAY_MS) };
    }
    case "30d":
    default:
      return { preset: "30d", from: from ?? new Date(now - 30 * DAY_MS), to };
  }
}

export function rangeLabel(range: MetricsRange): string {
  switch (range.preset) {
    case "today":
      return "today";
    case "7d":
      return "last 7 days";
    case "30d":
      return "last 30 days";
    case "all":
      return "all time";
    case "custom":
      return "custom range";
  }
}
