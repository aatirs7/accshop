export interface FaqEntry {
  /** Short label shown as a tappable quick-question chip. */
  question: string;
  /** Answer, plain text. Keep it concise and factual. */
  answer: string;
  /** Lowercase keywords used to match free-typed questions. */
  keywords: string[];
  /** Optional in-app link offered alongside the answer. */
  link?: { href: string; label: string };
}

export const FAQS: FaqEntry[] = [
  {
    question: "How does it work?",
    answer:
      "Pick an account, check out with card or Zelle, and we source it from our vetted supplier network. Once it's ready, your login credentials appear securely in your dashboard (never by email). Every account includes a warmup guide and a 30-day warranty.",
    keywords: ["how", "work", "works", "process", "buy", "purchase", "start", "get started"],
    link: { href: "/accounts", label: "Browse accounts" },
  },
  {
    question: "How fast is delivery?",
    answer:
      "Most accounts are delivered within 24 to 72 hours. Card payments confirm instantly; Zelle payments are confirmed manually, usually within a few hours. You'll get an email the moment your credentials are ready to view.",
    keywords: ["fast", "delivery", "deliver", "long", "time", "when", "receive", "wait", "how long", "quick", "speed"],
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept credit/debit card (instant) and Zelle (no fees, confirmed manually). At checkout you'll get a unique order code to put in your Zelle memo so we can match your payment.",
    keywords: ["pay", "payment", "card", "zelle", "crypto", "paypal", "method", "stripe", "checkout"],
  },
  {
    question: "What does the warranty cover?",
    answer:
      "Every account has a 30-day replacement warranty from delivery. If it's banned, restricted from TikTok Shop Affiliate, or not as described, we replace it. Issues from breaking TikTok's rules or skipping the warmup guide aren't covered.",
    keywords: ["warranty", "guarantee", "replace", "replacement", "banned", "ban", "refund", "protect", "covered", "coverage", "claim"],
    link: { href: "/warranty", label: "Read the warranty policy" },
  },
  {
    question: "Are the accounts safe / low ban risk?",
    answer:
      "Yes. Accounts are aged, warmed, and sourced for low ban risk, with 100% organic followers (no bots). Follow the included warmup guide before posting to keep your account and warranty healthy.",
    keywords: ["safe", "ban", "risk", "bot", "bots", "organic", "real", "followers", "quality", "legit", "safety", "secure"],
  },
  {
    question: "Can I use it for TikTok Shop?",
    answer:
      "Yes. Every account's TikTok Shop Affiliate eligibility is confirmed before we deliver it. If you want it fully enabled, choose the 'Enable TikTok Shop' option on the product page.",
    keywords: ["tiktok shop", "shop", "affiliate", "monetize", "sell", "commission", "eligible", "eligibility"],
  },
  {
    question: "Do I fully own the account?",
    answer:
      "Yes, 100%. You can change the login, email, password, and every recovery detail from day one. It's entirely yours after delivery.",
    keywords: ["own", "ownership", "mine", "change", "login", "email", "password", "recovery", "control"],
  },
  {
    question: "How are login credentials delivered?",
    answer:
      "Securely, never by plain email. After your account is ready, you sign in to your dashboard and reveal the encrypted credentials once. Have a password manager ready to save them.",
    keywords: ["credential", "credentials", "login", "delivered", "secure", "password", "reveal", "dashboard", "details"],
    link: { href: "/dashboard", label: "Go to dashboard" },
  },
  {
    question: "Do you offer bulk or partner pricing?",
    answer:
      "Yes. Mentors and programs ordering 10+ accounts get wholesale pricing, and our partner program offers referral commissions. Partner pricing is application-only.",
    keywords: ["bulk", "wholesale", "partner", "mentor", "discount", "volume", "10", "quantity", "reseller", "program", "commission"],
    link: { href: "/partners", label: "See the partner program" },
  },
  {
    question: "Is there a discount for first orders?",
    answer:
      "Yes, drop your email in the offer popup for $10 off your first account. It sends a one-time code you can use at checkout.",
    keywords: ["discount", "coupon", "code", "promo", "off", "cheap", "deal", "offer", "save", "10"],
  },
  {
    question: "How do I contact support?",
    answer:
      "Reply to any ACCSHOP email and it reaches our inbox, or use the contact page. If you already have an order, your dashboard is the fastest way to track it or file a warranty claim.",
    keywords: ["contact", "support", "help", "reach", "email", "talk", "human", "message", "question"],
    link: { href: "/contact", label: "Contact support" },
  },
];

export const FAQ_GREETING =
  "Hi! I'm the ACCSHOP assistant. Ask me about delivery, payments, warranty, or bulk pricing, or tap a question below.";

export const FAQ_FALLBACK =
  "I'm not totally sure about that one. The quickest way to get a solid answer is our team, they reply fast.";

/**
 * Curated keyword matcher. Scores each FAQ by how many of its keywords appear
 * in the user's message; returns the best match, or null for the fallback.
 */
export function matchFaq(input: string): FaqEntry | null {
  const text = ` ${input.toLowerCase()} `;
  let best: FaqEntry | null = null;
  let bestScore = 0;
  for (const faq of FAQS) {
    let score = 0;
    for (const kw of faq.keywords) {
      if (text.includes(` ${kw} `) || text.includes(kw)) {
        // Longer keyword phrases are stronger signals.
        score += kw.includes(" ") ? 3 : 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = faq;
    }
  }
  return bestScore > 0 ? best : null;
}
