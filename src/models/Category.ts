import { model, Schema, Document, models } from "mongoose";

export interface ISubcategory {
  key: string;
  label: string;
  synonyms: string[];
}

export interface ICategoryDoc extends Document {
  key: string;
  label: string;
  synonyms: string[];
  subcategories: ISubcategory[];
  isActive: boolean;
  /** Usluge iz ove kategorije traže zahtev klijentkinje (slika/link/opis).
   *  Nosi ga KATEGORIJA, ne usluga — nokti ga traže uvek, kroz sve
   *  podkategorije, pa se ne podešava po usluzi i ne može da se raziđe. */
  requiresIntake: boolean;
  popularityScore: number;
  createdAt: Date;
  updatedAt: Date;
}

const SubcategorySchema = new Schema<ISubcategory>(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    synonyms: [{ type: String }],
  },
  { _id: false },
);

const CategorySchema = new Schema<ICategoryDoc>(
  {
    key: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    synonyms: [{ type: String }],
    subcategories: [SubcategorySchema],
    isActive: { type: Boolean, default: true },
    requiresIntake: { type: Boolean, default: false },
    popularityScore: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Category =
  models.Category || model<ICategoryDoc>("Category", CategorySchema);
