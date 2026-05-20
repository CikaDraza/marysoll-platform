import "server-only";
import { connectToDB } from "@/lib/db/mongodb";
import { ProfilPlatforme } from "@/models/ProfilPlatforme";

export interface PlatformSocial {
  instagram: string;
  whatsapp: string;
  tiktok: string;
  facebook: string;
  telegram: string;
}

export async function getPlatformSocial(): Promise<PlatformSocial> {
  const empty: PlatformSocial = { instagram: "", whatsapp: "", tiktok: "", facebook: "", telegram: "" };
  try {
    await connectToDB();
    const profile = await ProfilPlatforme.findOne({}).select("social contactPhone").lean() as
      | { social?: Partial<PlatformSocial>; contactPhone?: string }
      | null;

    if (!profile) return empty;

    const s = profile.social ?? {};
    // whatsapp fallback: ako nema linka ali ima telefon
    const whatsapp = s.whatsapp || (profile.contactPhone
      ? `https://wa.me/${profile.contactPhone.replace(/\D/g, "")}`
      : "");

    return {
      instagram: s.instagram ?? "",
      whatsapp,
      tiktok: s.tiktok ?? "",
      facebook: s.facebook ?? "",
      telegram: s.telegram ?? "",
    };
  } catch {
    return empty;
  }
}
