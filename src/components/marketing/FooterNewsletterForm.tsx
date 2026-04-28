// components/FooterNewsletterForm.tsx
"use client";

import { useGuestNewsletterSubscription } from "@/hooks/useGuestNewsletterSubscription";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import LoaderButton from "../elements/LoaderButton";

export default function FooterNewsletterForm() {
  const [state, formAction, isLoading] = useActionState(
    useGuestNewsletterSubscription,
    null,
  );
  const { pending } = useFormStatus();

  return (
    <div className="max-w-xl lg:max-w-lg">
      {state?.success ? (
        <div className="mt-6 p-4 bg-blue-900/10 border border-blue-500 rounded-lg">
          <p className="text-blue-300 text-center">{state.message}</p>
        </div>
      ) : (
        <form
          action={formAction}
          className="mt-6 flex flex-col lg:flex-row max-w-md gap-x-1"
        >
          <label htmlFor="email-address" className="sr-only">
            Email adresa
          </label>
          <input
            id="email-address"
            name="email"
            type="email"
            required
            placeholder="Enter your email"
            autoComplete="email"
            disabled={pending}
            className="min-w-0 flex-auto rounded-md bg-white/5 px-3.5 py-2 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-(--secondary-color) sm:text-sm/6 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={pending}
            className="cursor-pointer flex-none mt-3 lg:mt-0 rounded-md bg-(--secondary-color) px-3.5 py-2.5 text-sm font-semibold text-(--primary-color) shadow-xs hover:bg-(--primary-color) hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--secondary-color) disabled:opacity-50"
          >
            {isLoading ? <LoaderButton /> : "Pretplatite se"}
          </button>
        </form>
      )}

      {state && !state.success && (
        <p className="mt-3 text-sm text-red-400">{state.message}</p>
      )}
    </div>
  );
}
