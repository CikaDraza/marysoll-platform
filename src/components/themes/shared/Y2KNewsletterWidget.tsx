"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useGuestNewsletterSubscription } from "@/hooks/useGuestNewsletterSubscription";
import { useTenant } from "@/contexts/TenantContext";

/**
 * Y2KNewsletterWidget — "BILTEN" newsletter subscription, Y2K styled.
 *
 * Reuses the real `useGuestNewsletterSubscription` server action (same as
 * marketing/FooterNewsletterForm) with the tenantId from TenantContext, so it
 * writes a genuine double-opt-in subscriber. Rendered as the "Bilten" modal card
 * (opened from the Hero/Footer buttons via Theme8ModalProvider).
 */
function SubscribeButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-y2k-purple text-white font-black text-[16px] tracking-[0.04em] uppercase px-6 py-4 border-[4px] border-y2k-ink rounded-full shadow-[4px_4px_0_#0b0b0f] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#0b0b0f] transition-all duration-200 disabled:opacity-60 cursor-pointer"
    >
      {pending ? "Šaljem..." : "Subscribe"}
    </button>
  );
}

export function Y2KNewsletterWidget() {
  const { tenantId } = useTenant();
  const [state, formAction] = useActionState(
    useGuestNewsletterSubscription,
    null,
  );

  return (
    <div className="relative bg-white border-[4px] border-y2k-ink rounded-[28px] p-8 sm:p-10 shadow-[10px_12px_0_#ff2e97]">
      <div className="font-extrabold text-[11px] tracking-[0.22em] uppercase text-y2k-pink">
        Newsletter
      </div>
        <h3 className="mt-1 font-bagel text-[clamp(40px,7vw,56px)] leading-[0.95] text-y2k-ink">
          BILTEN
        </h3>
        <p className="mt-2 text-[15px] leading-[1.55] font-medium text-[#42303a]">
          Lash tips, fresh drops &amp; first dibs on booking openings — straight
          to your inbox. No spam, pinky promise ♡
        </p>

        {state?.success ? (
          <div className="mt-5 rounded-2xl border-[3px] border-y2k-ink bg-y2k-pink/10 px-4 py-5 text-center">
            <p className="font-bagel text-[22px] text-y2k-ink">
              {state.message || "Subscribed ✓"}
            </p>
          </div>
        ) : (
          <form action={formAction} className="mt-5 flex flex-col gap-3">
            <input type="hidden" name="tenantId" value={tenantId} />
            <label htmlFor="y2k-newsletter-email" className="sr-only">
              Email adresa
            </label>
            <input
              id="y2k-newsletter-email"
              name="email"
              type="email"
              required
              placeholder="you@email.com"
              autoComplete="email"
              className="w-full px-4 py-3.5 border-[3px] border-y2k-ink rounded-[14px] text-[15px] text-y2k-ink bg-white outline-none placeholder:text-[#c9b3c0] focus:shadow-[3px_3px_0_#8B16C9] transition-shadow"
            />
            <SubscribeButton />
          </form>
        )}

        {state && !state.success && (
          <p className="mt-3 text-sm font-semibold text-y2k-pink">
            {state.message}
          </p>
        )}
    </div>
  );
}
