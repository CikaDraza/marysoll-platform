"use client";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

export default function Loader() {
  return (
    <div className="bg-transparent max-h-screen">
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
          <div className="text-center">
            <div className="flex justify-center w-full rounded-md px-3.5 py-2.5 text-center text-sm font-semibold text-black dark:text-white">
              {" "}
              <ArrowPathIcon className="mr-3 size-5 text-(--secondary-color) animate-spin ..." />
              Processing…
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
