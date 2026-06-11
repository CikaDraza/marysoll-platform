// src/lib/seo.ts
import { SeoMeta } from "@/models/SeoMeta";
import mongoose from "mongoose";

interface SeoData {
  title: string;
  description: string;
  noIndex: boolean;
}

export async function getSeoMeta(route: string): Promise<SeoData> {
  if (!mongoose.connection.readyState) {
    await mongoose.connect(process.env.MONGODB_URI!);
  }

  const doc = await SeoMeta.findOne({ route }).exec();

  return {
    title: doc?.title ?? "Marysoll Makeup & Nails Salon",
    description:
      doc?.description ?? "Profesionalne usluge šminkanja i manikira u Boru.",
    noIndex: doc?.noIndex ?? false,
  };
}
