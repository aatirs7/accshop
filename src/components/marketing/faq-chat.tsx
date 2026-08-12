"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  FAQS,
  FAQ_FALLBACK,
  FAQ_GREETING,
  matchFaq,
  type FaqEntry,
} from "@/lib/faq";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  role: "bot" | "user";
  text: string;
  link?: FaqEntry["link"];
}

export function FaqChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: FAQ_GREETING },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open]);

  function ask(text: string, matchedFaq?: FaqEntry) {
    const faq = matchedFaq ?? matchFaq(text);
    setMessages((m) => [
      ...m,
      { role: "user", text },
      faq
        ? { role: "bot", text: faq.answer, link: faq.link }
        : { role: "bot", text: FAQ_FALLBACK, link: { href: "/contact", label: "Contact support" } },
    ]);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    ask(text);
    setInput("");
  }

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close help chat" : "Open help chat"}
        className="fixed bottom-5 left-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-gold text-2xl text-[oklch(0.17_0.02_85)] shadow-xl transition-transform hover:scale-105"
      >
        {open ? "✕" : "💬"}
      </button>

      {open && (
        <div className="fixed bottom-24 left-5 z-40 flex h-[30rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-brand-gold/30 bg-card shadow-2xl">
          {/* Header */}
          <div className="bg-atmosphere border-b border-border/60 px-5 py-4">
            <p className="font-display text-base font-semibold text-brand-gold">
              ACCSHOP Assistant
            </p>
            <p className="text-xs text-muted-foreground">
              Answers to common questions
            </p>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-brand-gold text-[oklch(0.17_0.02_85)]"
                      : "bg-brand-raised text-foreground/90"
                  }`}
                >
                  {m.text}
                  {m.link && (
                    <Link
                      href={m.link.href}
                      onClick={() => setOpen(false)}
                      className="mt-1.5 block font-medium text-brand-gold underline underline-offset-2"
                    >
                      {m.link.label} →
                    </Link>
                  )}
                </div>
              </div>
            ))}

            {/* Quick questions (only before the user has asked anything) */}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {FAQS.slice(0, 6).map((f) => (
                  <button
                    key={f.question}
                    onClick={() => ask(f.question, f)}
                    className="rounded-full border border-border/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-brand-gold/50 hover:text-foreground"
                  >
                    {f.question}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={submit}
            className="flex gap-2 border-t border-border/60 p-3"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question…"
              className="h-10"
            />
            <Button type="submit" size="sm" className="h-10 shrink-0">
              Send
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
