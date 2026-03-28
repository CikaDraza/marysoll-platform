/**
 * UserSalon model — many-to-many veza između User i Tenant.
 *
 * Jedan korisnik može imati različite role u različitim salonima:
 *   - Ana je SALON_OWNER u "kiki-makeup" salonu
 *   - Ana je CLIENT u "beauty-bar" salonu
 *   - Marko je SALON_ADMIN u "kiki-makeup" salonu
 *   - Petar je STAFF u "kiki-makeup" salonu
 *
 * Backward compat:
 *   - User.isAdmin = true → SALON_OWNER ili SALON_ADMIN u UserSalon
 *   - User.isSuperAdmin = true → globalRole = SUPER_ADMIN u User
 *   - Migracija: zadržati User.isAdmin/isSuperAdmin za JWT kompatibilnost
 *     dok se ne migrira auth sistem
 */
import { SalonRole } from "@/types/roles";
import { Schema, Document, Types, model, models } from "mongoose";

export interface IUserSalon extends Document {
  userId: Types.ObjectId;
  salonId: Types.ObjectId;
  role: SalonRole;
  /** Granularne permisije — override per-korisnik unutar salona */
  permissions: string[];
  /** Da li je aktivna veza (nije obrisan staff/client) */
  isActive: boolean;
  /** Datum kada je korisnik dodat u salon */
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSalonSchema = new Schema<IUserSalon>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    salonId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    role: {
      type: String,
      enum: ["SALON_OWNER", "SALON_ADMIN", "STAFF", "CLIENT"] as SalonRole[],
      required: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// Jedan korisnik može imati samo jednu rolu po salonu
UserSalonSchema.index(
  { userId: 1, salonId: 1, role: 1, isActive: 1 },
  { unique: true },
);

export const UserSalon =
  models.UserSalon || model<IUserSalon>("UserSalon", UserSalonSchema);
