const steps = [
  {
    n: "01",
    title: "Order & pay",
    body: "Check out securely by card. Your order gets a unique tracking code the moment it's placed.",
  },
  {
    n: "02",
    title: "We source & verify",
    body: "Your account is pulled from our vetted supplier network and checked for follower quality and affiliate eligibility.",
  },
  {
    n: "03",
    title: "Secure delivery",
    body: "Credentials are encrypted and delivered through your dashboard, never by email, with our warmup guide.",
  },
  {
    n: "04",
    title: "14-day warranty",
    body: "Every account is covered for a full month from delivery. Problem? We replace it.",
  },
];

export function ProcessSteps() {
  return (
    <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((s) => (
        <li key={s.n} className="relative flex flex-col items-center text-center">
          <span className="font-display text-5xl font-light text-brand-gold/30">
            {s.n}
          </span>
          <h3 className="mt-3 font-display text-lg font-semibold">{s.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {s.body}
          </p>
        </li>
      ))}
    </ol>
  );
}
