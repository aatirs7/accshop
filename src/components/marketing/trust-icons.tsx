const items = [
  { icon: "🔒", label: "Secure Checkout" },
  { icon: "⚡", label: "1-5hr Delivery" },
  { icon: "💬", label: "24/7 Support" },
];

/** Compact reassurance row shown under the Add to Cart / Buy button. */
export function TrustIcons() {
  return (
    <div className="grid grid-cols-3 gap-2 border-t border-border/60 pt-4">
      {items.map((i) => (
        <div key={i.label} className="text-center">
          <div className="text-lg">{i.icon}</div>
          <div className="mt-1 text-xs text-muted-foreground">{i.label}</div>
        </div>
      ))}
    </div>
  );
}
