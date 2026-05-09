"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";

interface Props {
  data: {
    logo: string;
    navigation: {
      label: string;
      href: string;
    }[];
    cta: {
      label: string;
      href: string;
    };
    social: {
      instagram: string | undefined;
      facebook: string | undefined;
      tiktok: string | undefined;
    };
  };
  primaryColor?: string;
  secondaryColor?: string;
}

export function Theme5Header({
  data,
  primaryColor = "#a855f7",
  secondaryColor = "#ec4899",
}: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-black fixed inset-x-0 top-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center py-4 px-6">
        <div className="text-xl font-bold tracking-wide">
          {data?.logo ? (
            <Image
              width={720}
              height={720}
              alt={data?.logo}
              src={data?.logo}
              className="size-12 object-contain"
            />
          ) : (
            "MINA"
          )}
        </div>

        <nav className="hidden md:flex gap-6 text-sm uppercase">
          {data?.navigation?.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-gray-300 font-bold hover:text-yellow-500"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="md:hidden p-2 cursor-pointer"
        >
          <Bars3Icon className="size-6 text-white" />
        </button>
      </div>

      {/* Mobile menu */}
      <Transition
        show={mobileMenuOpen}
        as={Dialog}
        onClose={setMobileMenuOpen}
        className="md:hidden"
      >
        <TransitionChild
          as="div"
          className="fixed inset-0"
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="absolute inset-0 bg-black/50 z-10" />
        </TransitionChild>
        <TransitionChild
          as="div"
          className="fixed inset-y-0 right-0 z-50 w-full max-w-sm"
          enter="transform transition ease-in-out duration-300"
          enterFrom="translate-x-full"
          enterTo="translate-x-0"
          leave="transform transition ease-in-out duration-300"
          leaveFrom="translate-x-0"
          leaveTo="translate-x-full"
        >
          <DialogPanel
            className="h-full bg-white px-6 py-6 shadow-2xl"
            style={
              {
                "--primary-color": primaryColor,
                "--secondary-color": secondaryColor,
              } as React.CSSProperties
            }
          >
            <div className="flex items-center justify-between mb-8">
              <figure className="font-bold text-lg text-(--primary-color)">
                {data?.logo ? (
                  <Image
                    width={80}
                    height={80}
                    alt="logo"
                    src={data.logo}
                    className="h-8 w-auto object-cover"
                  />
                ) : (
                  "MINA"
                )}
              </figure>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 cursor-pointer"
              >
                <XMarkIcon className="size-5 text-(--primary-color)" />
              </button>
            </div>
            <div className="space-y-4">
              {data?.navigation?.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-gray-700 font-medium uppercase text-sm hover:text-(--primary-color) transition"
                >
                  {item.label}
                </Link>
              ))}
              {data?.cta && (
                <Link
                  href={data.cta.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center py-3 bg-(--primary-color) text-white font-semibold rounded-xl text-sm"
                >
                  {data.cta.label}
                </Link>
              )}
            </div>
          </DialogPanel>
        </TransitionChild>
      </Transition>
    </header>
  );
}
