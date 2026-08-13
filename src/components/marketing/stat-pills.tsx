export function StatPills({ accountsSold }: { accountsSold: number }) {
  const pills = [
    { label: `${accountsSold.toLocaleString()} sold`, icon: "✦" },
    { label: "100% organic followers", icon: "★" },
    { label: "14-day warranty", icon: "✓" },
  ];
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {pills.map((p) => (
        <span
          key={p.label}
          className="inline-flex items-center gap-2 rounded-full border border-brand-gold/30 bg-brand-gold/5 px-4 py-1.5 text-sm font-medium"
        >
          <span className="text-brand-gold">{p.icon}</span>
          {p.label}
        </span>
      ))}
    </div>
  );
}
