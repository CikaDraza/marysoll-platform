"use client";

import type { ComponentProps } from "react";
import { AnchorLink } from "../shared/AnchorLink";

/**
 * Theme-8 anchor link — the shared smooth same-page scroll, pre-set to clear
 * the floating pill nav (~96px).
 */
export function Theme8AnchorLink(
  props: Omit<ComponentProps<typeof AnchorLink>, "offset">,
) {
  return <AnchorLink offset={96} {...props} />;
}
