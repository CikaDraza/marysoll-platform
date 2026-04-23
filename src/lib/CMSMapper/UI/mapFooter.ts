import { SalonProfileData } from "@/types";

export function mapFooter(profile: SalonProfileData) {
  return {
    logo: profile.logo || profile.name,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    copyright: `© ${new Date().getFullYear()} ${profile.name}`,
  };
}
