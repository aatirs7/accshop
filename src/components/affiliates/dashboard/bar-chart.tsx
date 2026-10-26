import { cn } from "@/lib/utils";

export interface BarPoint {
  /** Short x-axis label, e.g. "Oct 20". */
  label: string;
  value: number;
  /** Formatted value shown above the bar and in the tooltip. */
  display: string;
  /** Full description for the tooltip, e.g. "Week of Oct 20: $300". */
  description: string;
}

const W = 320;
const H = 170;
const TOP = 22;
const BOTTOM = 24;
const SIDE = 4;

/**
 * Minimal accessible SVG bar chart. Values are printed above each bar and
 * repeated in a <title> tooltip; the last bar (this week) is highlighted.
 */
export function BarChart({
  title,
  description,
  points,
  tone = "gold",
}: {
  title: string;
  description: string;
  points: BarPoint[];
  tone?: "gold" | "success";
}) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const plotH = H - TOP - BOTTOM;
  const slot = (W - SIDE * 2) / Math.max(1, points.length);
  const barW = Math.min(28, slot * 0.62);
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-labelledby={`${id}-title ${id}-desc`}
      className="h-auto w-full overflow-visible"
    >
      <title id={`${id}-title`}>{title}</title>
      <desc id={`${id}-desc`}>
        {description} {points.map((p) => p.description).join(". ")}.
      </desc>
      {[0.5, 1].map((f) => (
        <line
          key={f}
          x1={SIDE}
          x2={W - SIDE}
          y1={TOP + plotH * (1 - f)}
          y2={TOP + plotH * (1 - f)}
          className="stroke-border"
          strokeDasharray="3 4"
        />
      ))}
      <line x1={SIDE} x2={W - SIDE} y1={TOP + plotH} y2={TOP + plotH} className="stroke-border" />
      {points.map((p, i) => {
        const h = p.value > 0 ? Math.max(3, (p.value / max) * plotH) : 0;
        const cx = SIDE + slot * i + slot / 2;
        const x = cx - barW / 2;
        const y = TOP + plotH - h;
        const isLast = i === points.length - 1;
        const fill =
          tone === "success"
            ? isLast
              ? "fill-brand-success"
              : "fill-brand-success/45"
            : isLast
              ? "fill-brand-gold"
              : "fill-brand-gold/45";
        return (
          <g key={`${p.label}-${i}`} className="group">
            <title>{p.description}</title>
            {/* Full-height hit area so hovering anywhere in the column works. */}
            <rect x={cx - slot / 2} y={0} width={slot} height={H} className="fill-transparent" />
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={4}
              className={cn(fill, "transition-opacity group-hover:opacity-80")}
            />
            {p.value > 0 && (
              <text
                x={cx}
                y={y - 6}
                textAnchor="middle"
                className={cn(
                  "text-[9px] tabular-nums",
                  isLast ? "fill-foreground font-medium" : "fill-muted-foreground",
                )}
              >
                {p.display}
              </text>
            )}
            <text
              x={cx}
              y={H - 8}
              textAnchor="middle"
              className={cn("text-[9px]", isLast ? "fill-foreground" : "fill-muted-foreground")}
            >
              {isLast ? "This wk" : p.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
