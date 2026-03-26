import { groupAndSortServices } from "@/helpers/groupeAndSortServices";
import { formatPriceToString } from "@/helpers/formatPrice";
import { CheckIcon } from "@heroicons/react/24/outline";
import { IService } from "@/types";

export default function ServicesLayout({ services }: { services: IService[] }) {
  const groupedServices = groupAndSortServices(services);

  return (
    <div className="bg-transparent py-12 lg:py-32">
      <div className="relative isolate px-1 pt-14 lg:px-8">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        >
          <div
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
            className="relative left-[calc(50%-11rem)] aspect-1155/678 w-144.5 -translate-x-1/2 rotate-30 bg-linear-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-288.75"
          />
        </div>
      </div>
      <div className="flex justify-center flex-wrap px-1 lg:px-8">
        <span className="text-sm font-bold pb-8 w-full text-center text-(--primary-color)">
          usluge
        </span>
        <h1 className="text-4xl! lg:text-7xl! text-pretty text-gray-900 text-center font-bold">
          Nase usluge i cene bez trikova
        </h1>
        <p className="mt-8 w-4xl text-center text-sm lg:text-lg font-medium text-pretty text-gray-500 sm:text-xl/8 px-6 lg:px-8">
          Profesionalna šminka za sve prilike, od dnevne do večernje. Nega lica,
          obrva i noktiju. Otkrijte našu paletu usluga i tretmana dizajniranih
          da istaknu vašu prirodnu lepotu.
        </p>
      </div>
      <div className="pt-16 lg:pt-24 flex flex-col gap-y-8">
        {groupedServices?.map((group) => (
          <div
            key={group.category}
            className="max-w-full lg:py-24 px-2 lg:px-8"
          >
            <div className="mx-auto max-w-2xl lg:mx-0">
              <h2 className="text-2xl! font-semibold tracking-tight text-pretty text-gray-900 sm:text-5xl! lg:text-7xl!">
                {group.category || "Usluga"}
              </h2>
            </div>
            <div className="mx-auto mt-10 grid grid-cols-1 gap-x-8 gap-y-16 border-t border-gray-100 pt-10 sm:mt-16 sm:pt-16 lg:mx-0 lg:max-w-none lg:grid-cols-2">
              {group.services.map((service, index) => (
                <article
                  key={index}
                  className="flex max-w-3xl flex-col items-start justify-between"
                >
                  <div className="w-full flex justify-between items-center gap-x-4 text-xs">
                    <time
                      dateTime={service?.duration?.toString()}
                      className="text-gray-500"
                    >
                      Trajanje: {service?.duration} minuta
                    </time>
                    {service.basePrice && (
                      <span className="relative z-10 rounded-full bg-(--secondary-color) px-3 py-1.5 font-semibold text-white">
                        {formatPriceToString(service.basePrice)} RSD
                      </span>
                    )}
                  </div>
                  <div className="group w-full relative grow">
                    <h3 className="mt-3 text-lg/6 font-semibold text-gray-900 group-hover:text-gray-600">
                      {service.name}
                      {service.subcategory && ` - ${service.subcategory}`}
                    </h3>
                    <p className="mt-5 line-clamp-3 text-sm/6 text-gray-600">
                      {service.description}
                    </p>
                    <ul
                      role="list"
                      className="text-gray-300 mt-3 space-y-1 text-xs"
                    >
                      {service?.variants?.map((item, idx) => (
                        <li
                          key={idx}
                          className="w-full flex justify-between items-center gap-x-3 text-pretty text-gray-900 ml-0 lg:ml-6 list-disc"
                        >
                          <span className="flex gap-x-2">
                            <CheckIcon
                              aria-hidden="true"
                              className="text-(--secondary-color) h-6 w-5 flex-none"
                            />
                            {item.name}
                          </span>
                          <hr className="flex-1 border-dashed text-gray-700" />
                          <span className="rounded-full text-[.65rem] lg:text-sm bg-white px-3 py-0.5 font-semibold text-(--secondary-color)">
                            {formatPriceToString(item.price)} <small>RSD</small>
                          </span>
                        </li>
                      ))}
                    </ul>
                    {service.items.length > 0 && (
                      <p className="mt-5 font-semibold text-gray-700">
                        Šta je uključeno
                      </p>
                    )}
                    <ul
                      role="list"
                      className="text-gray-300 mt-1 space-y-1 text-sm/6 sm:mt-3"
                    >
                      {service.items.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex gap-x-3 text-pretty text-gray-900 flex-col ml-6 list-disc"
                        >
                          <span className="flex gap-x-2">
                            <CheckIcon
                              aria-hidden="true"
                              className="text-(--secondary-color) h-6 w-5 flex-none"
                            />
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
