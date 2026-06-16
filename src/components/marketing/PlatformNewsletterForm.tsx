"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useGuestNewsletterSubscription } from "@/hooks/useGuestNewsletterSubscription";
import LoaderButton from "../elements/LoaderButton";

/**
 * Newsletter prijava za Marysoll PLATFORMU (marysoll.com).
 * Ne šalje tenantId → subscribeToNewsletter kreira platform AudienceContact
 * (tenantId: null) i šalje verifikacioni email. Bez TenantContext zavisnosti.
 */
export default function PlatformNewsletterForm({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const [state, formAction, isLoading] = useActionState(
    useGuestNewsletterSubscription,
    null,
  );
  const { pending } = useFormStatus();

  useEffect(() => {
    if (state?.success) onSuccess?.();
  }, [state?.success, onSuccess]);

  return (
    <div className="max-w-xl lg:max-w-lg">
      {state?.success ? (
        <div className="mt-6 p-4 bg-violet-500/10 border border-violet-400 rounded-lg">
          <p className="text-violet-200 text-center">{state.message}</p>
        </div>
      ) : (
        <form
          action={formAction}
          className="mt-6 flex flex-col sm:flex-row max-w-md gap-2"
        >
          <label htmlFor="exit-newsletter-email" className="sr-only">
            Email adresa
          </label>
          <input
            id="exit-newsletter-email"
            name="email"
            type="email"
            required
            placeholder="Unesite vaš email"
            autoComplete="email"
            disabled={pending}
            className="min-w-0 flex-auto rounded-md bg-white/5 px-3.5 py-2.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-violet-400 sm:text-sm/6 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={pending}
            className="cursor-pointer flex-none rounded-md bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-violet-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 disabled:opacity-50 transition"
          >
            {isLoading ? <LoaderButton color="white" /> : "Pretplati se"}
          </button>
        </form>
      )}

      {state && !state.success && (
        <p className="mt-3 text-sm text-red-400">{state.message}</p>
      )}
    </div>
  );
}
