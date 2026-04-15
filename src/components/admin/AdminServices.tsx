import AdminServiceModal from "./AdminServiceModal";
import { useServices } from "@/hooks/useServices";
import { useAdminServiceForm } from "@/hooks/useAdminServiceForm";
import { formatISODate } from "@/helpers/formatISODate";
import { CheckIcon } from "@heroicons/react/24/outline";
import { useServiceMutations } from "@/hooks/useServiceMutations";
import { formatPriceToString } from "@/helpers/formatPrice";
import Link from "next/link";

export default function AdminServices() {
  const { data: services = [] } = useServices();
  const { deleteService } = useServiceMutations();

  const {
    isOpen,
    form,
    setForm,
    save,
    setIsOpen,
    editing,
    openCreate,
    openEdit,
  } = useAdminServiceForm();

  function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(" ");
  }

  function isDark(srv: { featured?: string | null }) {
    return srv.featured === "main";
  }

  return (
    <div className="lg:p-6">
      <div className="flex flex-col lg:flex-row justify-between items-center mb-6">
        <h3 className="text-2xl! text-(--primary-color) font-bold">Usluge</h3>
        <button
          onClick={openCreate}
          className="mt-8 lg:mt-0 px-4 py-2 rounded-lg font-semibold text-sm bg-(--secondary-color) text-white"
        >
          + Nova usluga
        </button>
      </div>

      <div className="mx-auto mt-16 grid max-w-full grid-cols-1 items-center gap-x-3 gap-y-6 sm:mt-20 sm:gap-y-8 lg:grid-cols-1">
        {services.map((srv, idx) => {
          const dark = isDark(srv);

          return (
            <div
              key={srv._id}
              className={classNames(
                dark
                  ? "bg-gray-900 text-gray-100 shadow-2xl ring-1 ring-gray-700"
                  : "bg-white/60 text-gray-900 ring-1 ring-gray-900/10",
                idx === 1
                  ? ""
                  : idx === 0
                    ? "rounded-t-3xl sm:rounded-b-none lg:rounded-tr-none lg:rounded-bl-3xl"
                    : "sm:rounded-t-none lg:rounded-tr-3xl lg:rounded-bl-none",
                "rounded-3xl p-8 sm:p-10",
              )}
            >
              {/* -------------------- TITLE -------------------- */}
              <h3
                className={classNames(
                  dark ? "text-(--secondary-color)" : "text-(--primary-color)",
                  "text-base/7 font-semibold",
                )}
              >
                {srv.name}
              </h3>

              <p
                className={classNames(
                  dark ? "text-gray-400" : "text-gray-500",
                  "text-xs mt-1",
                )}
              >
                {srv.category}
                {srv.subcategory ? ` • ${srv.subcategory}` : ""}
              </p>

              {/* ------------------------------------------------------ */}
              {/* ------------------- SUBSCRIPTION --------------------- */}
              {/* ------------------------------------------------------ */}
              {srv.subscription?.enabled && (
                <div className="mt-4">
                  <p className="flex items-baseline gap-x-2">
                    <span
                      className={classNames(
                        dark ? "text-gray-50" : "text-gray-900",
                        "text-5xl lg:text-7xl font-semibold tracking-tight",
                      )}
                    >
                      {formatPriceToString(srv.subscription?.priceMonthly)}
                    </span>
                    <span
                      className={classNames(
                        dark ? "text-gray-400" : "text-gray-500",
                        "text-base",
                      )}
                    >
                      /mesečno
                    </span>
                  </p>

                  {(srv.subscription?.startDate ||
                    srv.subscription?.endDate) && (
                    <p className="mt-2 flex flex-wrap items-center gap-x-1 text-xs">
                      {srv.subscription?.startDate && (
                        <>
                          <span
                            className={dark ? "text-gray-400" : "text-gray-500"}
                          >
                            počinje
                          </span>
                          <span
                            className={classNames(
                              srv.subscription?.enabled
                                ? "text-gray-100 font-semibold"
                                : "text-(--secondary-color) font-semibold",
                            )}
                          >
                            {formatISODate(srv.subscription.startDate)}
                          </span>
                        </>
                      )}

                      {srv.subscription?.endDate && (
                        <>
                          <span
                            className={dark ? "text-gray-400" : "text-gray-500"}
                          >
                            završava se
                          </span>
                          <span
                            className={classNames(
                              srv.subscription?.enabled
                                ? "text-gray-100 font-semibold"
                                : "text-(--secondary-color) font-semibold",
                            )}
                          >
                            {formatISODate(srv.subscription.endDate)}
                          </span>
                        </>
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------ */}
              {/* ---------------------- PRICE ------------------------- */}
              {/* ------------------------------------------------------ */}

              {srv.type !== "variant" && (
                <p className="mt-4 flex items-baseline gap-x-2">
                  <span
                    className={classNames(
                      dark ? "text-white" : "text-gray-900",
                      "font-semibold tracking-tight",
                      dark ? "text-4xl lg:text-7xl" : "text-4xl lg:text-7xl",
                    )}
                  >
                    {formatPriceToString(srv.basePrice)}
                  </span>
                  <span
                    className={classNames(
                      dark ? "text-gray-400" : "text-gray-500",
                      "text-base",
                    )}
                  >
                    /terminu
                  </span>
                </p>
              )}

              {/* ------------------------------------------------------ */}
              {/* ------------------ DESCRIPTION ------------------------ */}
              {/* ------------------------------------------------------ */}
              {srv.description && (
                <p
                  className={classNames(
                    dark ? "text-gray-300" : "text-gray-600",
                    "mt-6 text-xs lg:text-base/7",
                  )}
                >
                  {srv.description}
                </p>
              )}

              {/* ------------------------------------------------------ */}
              {/* ---------------------- VARIANT LIST ------------------- */}
              {/* ------------------------------------------------------ */}

              {/* GROUP → varijante kao check lista */}
              {srv.type === "group" &&
                srv.variants &&
                srv.variants.length > 0 && (
                  <ul
                    className={classNames(
                      dark ? "text-gray-200" : "text-gray-700",
                      "mt-8 space-y-3 text-sm/6",
                    )}
                  >
                    {srv?.variants.map((v, idx) => (
                      <li key={idx} className="flex gap-x-3">
                        <CheckIcon
                          aria-hidden="true"
                          className={classNames(
                            dark
                              ? "text-indigo-400"
                              : "text-(--secondary-color)",
                            "h-6 w-5 flex-none",
                          )}
                        />
                        {v.name}
                      </li>
                    ))}
                  </ul>
                )}

              {/* VARIANT → varijante name - price */}
              {srv.type === "variant" &&
                srv.variants &&
                srv.variants.length > 0 && (
                  <ul
                    className={classNames(
                      dark ? "text-gray-300" : "text-gray-600",
                      "mt-8 space-y-3 text-sm/6",
                    )}
                  >
                    {srv.variants.map((v, idx) => (
                      <li
                        key={idx}
                        className="flex justify-between items-center gap-x-3"
                      >
                        <span className="font-semibold">{v.name}</span>
                        <hr className="border-dashed border-gray-200 flex-1" />
                        <span className="font-semibold">
                          {formatPriceToString(v.price)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

              {/* ------------------------------------------------------ */}
              {/* ----------------------- ITEMS ------------------------- */}
              {/* ------------------------------------------------------ */}
              {(srv.items?.length ?? 0) > 0 && (
                <ul
                  role="list"
                  className={classNames(
                    dark ? "text-gray-300" : "text-gray-600",
                    "mt-8 space-y-3 text-sm/6",
                  )}
                >
                  {srv.items.map((item) => (
                    <li key={item} className="flex gap-x-3">
                      <CheckIcon
                        aria-hidden="true"
                        className={classNames(
                          dark ? "text-indigo-400" : "text-(--secondary-color)",
                          "h-6 w-5 flex-none",
                        )}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              )}

              {/* ------------------------------------------------------ */}
              {/* -------------------- CTA SUBSCRIBE ------------------- */}
              {/* ------------------------------------------------------ */}
              {srv.subscription?.enabled && (
                <Link
                  href="#"
                  aria-describedby={srv._id}
                  className={classNames(
                    dark
                      ? "bg-(--secondary-color) text-white shadow-xs hover:bg-(--secondary-color)/80"
                      : "text-(--secondary-color) inset-ring inset-ring-indigo-200 hover:inset-ring-(--secondary-color)",
                    "mt-8 block rounded-md px-3.5 py-2.5 text-center text-sm font-semibold opacity-50 cursor-not-allowed",
                  )}
                >
                  Pretplati se danas
                </Link>
              )}
              <div className="flex items-center gap-x-3">
                <button
                  onClick={() => deleteService.mutate(srv._id!)}
                  className={classNames(
                    "flex-1 bg-(--red-color) text-white cursor-pointer shadow-xs hover:bg-(--red-color)/80 focus-visible:outline-(--primary-color) mt-8 block rounded-md px-3.5 py-2.5 text-center text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 sm:mt-10",
                  )}
                >
                  Obriši
                </button>
                <button
                  onClick={() => openEdit(srv)}
                  className={classNames(
                    "flex-2 bg-(--secondary-color) cursor-pointer text-white shadow-xs hover:text-white/80 hover:bg-(--secondary-color)/80 focus-visible:outline-(--primary-color) mt-8 block rounded-md px-3.5 py-2.5 text-center text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 sm:mt-10",
                  )}
                >
                  Izmeni
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <AdminServiceModal
        form={form}
        setForm={setForm}
        save={save}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        editing={editing}
      />
    </div>
  );
}
