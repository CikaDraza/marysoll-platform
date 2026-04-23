import { SalonProfileData } from "@/types";

export function mapHeader(profile: SalonProfileData) {
  return {
    logo: profile.logo || profile.name,

    navigation: [
      { label: "Home", href: "/" },
      { label: "Services", href: "/services" },
      { label: "Booking", href: "/booking" },
      { label: "Gallery", href: "/gallery" },
      { label: "Contact", href: "/contact" },
    ],

    cta: {
      label: "Book Now",
      href: "/booking",
    },

    social: {
      instagram: profile.social?.instagram,
      facebook: profile.social?.facebook,
      tiktok: profile.social?.tiktok,
    },
  };
}
