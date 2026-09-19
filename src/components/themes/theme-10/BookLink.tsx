"use client";
/**
 * BookLink — CTA „Zakaži termin". Otvara theme-10 booking modal; bez modala
 * (ili bez JS-a, ili klik sa modifikatorom) ostaje navigacija na `/termini`.
 */
import type { MouseEvent, ReactNode } from "react";
import { useTheme10Booking } from "./booking/context";

interface Props {
  href: string;
  className?: string;
  children: ReactNode;
}

export function BookLink({ href, className, children }: Props) {
  const { open, available } = useTheme10Booking();

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    if (!available) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    open();
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      aria-haspopup={available ? "dialog" : undefined}
      className={className}
    >
      {children}
    </a>
  );
}
