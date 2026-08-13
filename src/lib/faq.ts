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
      "Pick an account and check out with Zelle. We source it from our vetted supplier network, then email your login details straight to you, usually within 24 to 72 hours. Every account includes a warmup guide and a 14-day warranty.",
    keywords: ["how", "work", "works", "process", "buy", "purchase", "start", "get started"],
    link: { href: "/accounts", label: "Browse accounts" },
  },
  {
    question: "How fast is delivery?",
    answer:
      "Most accounts are delivered within 24 to 72 hours. Once your Zelle payment is confirmed (usually a few hours), we email your account login details directly to you.",
    keywords: ["fast", "delivery", "deliver", "long", "time", "when", "receive", "wait", "how long", "quick", "speed", "email"],
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept Zelle. At checkout you'll get a unique order code to include in your Zelle memo so we can match your payment quickly.",
    keywords: ["pay", "payment", "card", "zelle", "crypto", "paypal", "method", "checkout"],
  },
  {
    question: "What does the warranty cover?",
    answer:
      "Every account has a 14-day replacement warranty from delivery. If it's banned, restricted from TikTok Shop Affiliate, or not as described, we replace it. Issues from breaking TikTok's rules or skipping the warmup guide aren't covered.",
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
      "By email. Once your payment is confirmed and the account is ready, we email your username, password, and linked email. Change the password and recovery email right away and save them somewhere safe.",
    keywords: ["credential", "credentials", "login", "delivered", "password", "email", "details", "receive"],
  },
  {
    question: "Can I earn by referring people?",
    answer:
      "Yes! Sign up as an affiliate for free, get a unique referral code, and earn 10% (that's $55) on every account sold through your link. Track your referrals and commission in your dashboard.",
    keywords: ["affiliate", "refer", "referral", "commission", "earn", "10%", "code", "money", "payout"],
    link: { href: "/affiliates", label: "Become an affiliate" },
  },
  {
    question: "Do you offer bulk or partner pricing?",
    answer:
      "Yes. Coaches and programs ordering 10+ accounts get wholesale pricing plus referral commissions through our partner program. It's application-only.",
    keywords: ["bulk", "wholesale", "partner", "coach", "mentor", "volume", "quantity", "reseller", "program"],
    link: { href: "/partners", label: "See the partner program" },
  },
  {
    question: "How do I contact support?",
    answer:
      "Email aashirsiddiqui13@gmail.com anytime with your order code and we'll help, whether it's a question before buying, delivery, or a warranty claim.",
    keywords: ["contact", "support", "help", "reach", "email", "talk", "human", "message", "question", "warranty"],
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
