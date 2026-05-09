"use client";
import { useState } from "react";

interface Props {
  headline?: string;
  subheadline?: string;
}

export function Theme6Newsletter({
  headline = "Join Our Newsletter",
  subheadline = "Stay updated with exclusive offers, beauty tips, and latest trends",
}: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (email) {
      setStatus("success");
      setEmail("");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-[#F5EDE5] to-[#EAE0D5]">
      <div className="max-w-4xl mx-auto px-6 lg:px-12">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl lg:text-5xl font-light text-[var(--foreground)]">{headline}</h2>
            <p className="text-lg font-light text-[var(--muted)] max-w-2xl mx-auto">{subheadline}</p>
          </div>

          <form onSubmit={handleSubmit} className="max-w-xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="flex-1 px-6 py-4 bg-white border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--primary)] transition-colors"
              />
              <button
                type="submit"
                className="px-8 py-4 bg-[var(--foreground)] text-white text-sm tracking-wide font-light hover:opacity-90 transition-all hover:scale-105 whitespace-nowrap"
              >
                Subscribe
              </button>
            </div>
            {status === "success" && (
              <p className="mt-4 text-sm font-light text-green-600">Thank you for subscribing! Check your inbox.</p>
            )}
            {status === "error" && (
              <p className="mt-4 text-sm font-light text-red-600">Something went wrong. Please try again.</p>
            )}
          </form>

          <p className="text-xs font-light text-[var(--muted)]">We respect your privacy. Unsubscribe at any time.</p>
        </div>
      </div>
    </section>
  );
}
