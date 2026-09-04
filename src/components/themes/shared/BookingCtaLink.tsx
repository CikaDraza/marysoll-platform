"use client";

/**
 * BookingCtaLink — CTA koji otvara BookingWidget umesto da vodi na /termini.
 *
 * Ponaša se kao `AnchorLink` kad widget nije na strani, pa se stari `href` iz
 * CMS-a čuva kao fallback: dugme radi i bez JS-a, i na temama bez widgeta.
 */
import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { AnchorLink } from "./AnchorLink";
import { useBookingLauncher } from "./BookingLauncher";

interface Props extends Omit<ComponentProps<typeof AnchorLink>, "children"> {
  href: string;
  children: ReactNode;
}

export function BookingCtaLink({ href, children, onClick, ...rest }: Props) {
  const { open, available } = useBookingLauncher();

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented) return;
    // Modifikovan klik (novi tab) mora da ostane navigacija.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!available) return;
    e.preventDefault();
    open();
  }

  return (
    <AnchorLink href={href} onClick={handleClick} {...rest}>
      {children}
    </AnchorLink>
  );
}
