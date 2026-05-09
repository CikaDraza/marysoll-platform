import { SalonProfileData } from "@/types";

export function mapFooter(profile: SalonProfileData) {
  return {
    logo: profile.logo || profile.name,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    social: profile.social,
    tenantSlug: profile.tenantSlug,
    salonName: profile.name,
    instagram: profile.social?.instagram,
    facebook: profile.social?.facebook,
    tiktok: profile.social?.tiktok,
    copyright: `© ${new Date().getFullYear()} ${profile.name}`,
  };
}
