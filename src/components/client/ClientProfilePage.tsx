export default function ClientProfilePage() {
  return (
    <div className="relative isolate px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <form>
          <div className="space-y-12">
            <div className="border-b border-gray-900/10 pb-12">
              <h2 className="text-2xl! font-semibold text-gray-900">
                Lične informacije
              </h2>
              <p className="mt-1 text-sm/6 text-gray-600">
                Koristite stalnu adresu na kojoj možete primati poštu.
              </p>

              <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label
                    htmlFor="first-name"
                    className="block text-sm/6 font-medium text-gray-900"
                  >
                    Vaše ime
                  </label>
                  <div className="mt-2">
                    <input
                      id="first-name"
                      name="first-name"
                      type="text"
                      autoComplete="given-name"
                      className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                    />
                  </div>
                </div>

                <div className="sm:col-span-4">
                  <label
                    htmlFor="email"
                    className="block text-sm/6 font-medium text-gray-900"
                  >
                    Email adresa
                  </label>
                  <div className="mt-2">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                    />
                  </div>
                </div>

                <div className="col-span-full">
                  <label
                    htmlFor="street-address"
                    className="block text-sm/6 font-medium text-gray-900"
                  >
                    Ulica
                  </label>
                  <div className="mt-2">
                    <input
                      id="street-address"
                      name="street-address"
                      type="text"
                      autoComplete="street-address"
                      className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 sm:col-start-1">
                  <label
                    htmlFor="city"
                    className="block text-sm/6 font-medium text-gray-900"
                  >
                    Grad
                  </label>
                  <div className="mt-2">
                    <input
                      id="city"
                      name="city"
                      type="text"
                      autoComplete="address-level2"
                      className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="region"
                    className="block text-sm/6 font-medium text-gray-900"
                  >
                    Država / Pokrajina
                  </label>
                  <div className="mt-2">
                    <input
                      id="region"
                      name="region"
                      type="text"
                      autoComplete="address-level1"
                      className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="postal-code"
                    className="block text-sm/6 font-medium text-gray-900"
                  >
                    Poštanski broj
                  </label>
                  <div className="mt-2">
                    <input
                      id="postal-code"
                      name="postal-code"
                      type="text"
                      autoComplete="postal-code"
                      className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-b border-gray-900/10 pb-12">
              <h2 className="text-2xl! font-semibold text-gray-900">
                Obaveštenja
              </h2>
              <p className="mt-1 text-sm/6 text-gray-600">
                Uvek vas obaveštavamo o važnim promenama, ali vi birate o čemu
                još želite da budete obavešteni.
              </p>

              <div className="mt-10 space-y-10">
                <fieldset>
                  <legend className="text-sm/6 font-semibold text-gray-900">
                    Obaveštenja sa ovoga sajta
                  </legend>
                  <div className="mt-6 space-y-6">
                    <div className="flex gap-3">
                      <div className="flex h-6 shrink-0 items-center">
                        <div className="group grid size-4 grid-cols-1">
                          <input
                            defaultChecked
                            id="comments"
                            name="comments"
                            type="checkbox"
                            aria-describedby="comments-description"
                            className="col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-(--primary-color) checked:bg-(--primary-color) indeterminate:border-(--primary-color) indeterminate:bg-(--primary-color) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary-color) disabled:border-gray-300 disabled:bg-gray-100 disabled:checked:bg-gray-100 forced-colors:appearance-auto"
                          />
                          <svg
                            fill="none"
                            viewBox="0 0 14 14"
                            className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled:stroke-gray-950/25"
                          >
                            <path
                              d="M3 8L6 11L11 3.5"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="opacity-0 group-has-checked:opacity-100"
                            />
                            <path
                              d="M3 7H11"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="opacity-0 group-has-indeterminate:opacity-100"
                            />
                          </svg>
                        </div>
                      </div>
                      <div className="text-sm/6">
                        <label
                          htmlFor="comments"
                          className="font-medium text-gray-900"
                        >
                          Comments
                        </label>
                        <p id="comments-description" className="text-gray-500">
                          Get notified when someones posts a comment on a
                          posting.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex h-6 shrink-0 items-center">
                        <div className="group grid size-4 grid-cols-1">
                          <input
                            id="candidates"
                            name="candidates"
                            type="checkbox"
                            aria-describedby="candidates-description"
                            className="col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-(--primary-color) checked:bg-(--primary-color) indeterminate:border-(--primary-color) indeterminate:bg-(--primary-color) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary-color) disabled:border-gray-300 disabled:bg-gray-100 disabled:checked:bg-gray-100 forced-colors:appearance-auto"
                          />
                          <svg
                            fill="none"
                            viewBox="0 0 14 14"
                            className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled:stroke-gray-950/25"
                          >
                            <path
                              d="M3 8L6 11L11 3.5"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="opacity-0 group-has-checked:opacity-100"
                            />
                            <path
                              d="M3 7H11"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="opacity-0 group-has-indeterminate:opacity-100"
                            />
                          </svg>
                        </div>
                      </div>
                      <div className="text-sm/6">
                        <label
                          htmlFor="candidates"
                          className="font-medium text-gray-900"
                        >
                          Candidates
                        </label>
                        <p
                          id="candidates-description"
                          className="text-gray-500"
                        >
                          Get notified when a candidate applies for a job.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex h-6 shrink-0 items-center">
                        <div className="group grid size-4 grid-cols-1">
                          <input
                            id="offers"
                            name="offers"
                            type="checkbox"
                            aria-describedby="offers-description"
                            className="col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-(--primary-color) checked:bg-(--primary-color) indeterminate:border-(--primary-color) indeterminate:bg-(--primary-color) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary-color) disabled:border-gray-300 disabled:bg-gray-100 disabled:checked:bg-gray-100 forced-colors:appearance-auto"
                          />
                          <svg
                            fill="none"
                            viewBox="0 0 14 14"
                            className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled:stroke-gray-950/25"
                          >
                            <path
                              d="M3 8L6 11L11 3.5"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="opacity-0 group-has-checked:opacity-100"
                            />
                            <path
                              d="M3 7H11"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="opacity-0 group-has-indeterminate:opacity-100"
                            />
                          </svg>
                        </div>
                      </div>
                      <div className="text-sm/6">
                        <label
                          htmlFor="offers"
                          className="font-medium text-gray-900"
                        >
                          Offers
                        </label>
                        <p id="offers-description" className="text-gray-500">
                          Get notified when a candidate accepts or rejects an
                          offer.
                        </p>
                      </div>
                    </div>
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="text-sm/6 font-semibold text-gray-900">
                    Push notifications
                  </legend>
                  <p className="mt-1 text-sm/6 text-gray-600">
                    These are delivered via SMS to your mobile phone.
                  </p>
                  <div className="mt-6 space-y-6">
                    <div className="flex items-center gap-x-3">
                      <input
                        defaultChecked
                        id="push-everything"
                        name="push-notifications"
                        type="radio"
                        className="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-(--primary-color) checked:bg-(--primary-color) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary-color) disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden"
                      />
                      <label
                        htmlFor="push-everything"
                        className="block text-sm/6 font-medium text-gray-900"
                      >
                        Everything
                      </label>
                    </div>
                    <div className="flex items-center gap-x-3">
                      <input
                        id="push-email"
                        name="push-notifications"
                        type="radio"
                        className="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-(--primary-color) checked:bg-(--primary-color) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary-color) disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden"
                      />
                      <label
                        htmlFor="push-email"
                        className="block text-sm/6 font-medium text-gray-900"
                      >
                        Same as email
                      </label>
                    </div>
                    <div className="flex items-center gap-x-3">
                      <input
                        id="push-nothing"
                        name="push-notifications"
                        type="radio"
                        className="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-(--primary-color) checked:bg-(--primary-color) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary-color) disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden"
                      />
                      <label
                        htmlFor="push-nothing"
                        className="block text-sm/6 font-medium text-gray-900"
                      >
                        No push notifications
                      </label>
                    </div>
                  </div>
                </fieldset>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-x-6">
            <button
              type="button"
              className="text-sm/6 font-semibold text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-(--secondary-color) px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-(--primary-color) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--secondary-color-focus)"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
