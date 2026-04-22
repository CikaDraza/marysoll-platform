import mongoose, { model, models, Types } from "mongoose";

export type LandingTheme = "theme-1" | "theme-2" | "theme-3" | "theme-4";

const ctaSchema = new mongoose.Schema({
  text: { type: String },
  href: { type: String },
});

const instructionSchema = new mongoose.Schema({
  name: { type: String },
  icon: { type: String }, // Heroicon name e.g. "CalendarDaysIcon"
});

const faqItemSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
});

const SalonProfileSchema = new mongoose.Schema(
  {
    tenantId: {
      type: Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    name: { type: String, required: true },
    email: { type: String, required: true },
    description: { type: String },

    isDemo: { type: Boolean, default: false },

    landingStructure: {
      landing: {
        hero: {
          enabled: { type: Boolean, default: true },
          headline: { type: String },
          subheadline: { type: String },
          whereWhatForWhom: { type: String },
          contact: {
            location: { type: String },
            phone: { type: String },
          },
          socialLinks: {
            instagram: { type: String },
            facebook: { type: String },
            tiktok: { type: String },
            whatsapp: { type: String },
            telegram: { type: String },
          },
          ctas: {
            primary: ctaSchema,
            secondary: ctaSchema,
          },
          /** Single hero image — theme-1 and theme-2. */
          image: {
            src: { type: String },
            alt: { type: String },
          },
          /** Four-image hero grid — theme-3. */
          images: {
            type: [{ src: { type: String }, alt: { type: String } }],
            default: [],
          },
        },
        about: {
          enabled: { type: Boolean, default: true },
          headline: { type: String },
          paragraphs: { type: [String], default: [] },
        },
        servicesPreview: {
          enabled: { type: Boolean, default: true },
          headline: { type: String },
          subheadline: { type: String },
        },
        appointmentSection: {
          enabled: { type: Boolean, default: true },
          headline: { type: String },
          subheadline: { type: String },
          instructions: { type: [instructionSchema], default: [] },
        },
        testimonials: {
          enabled: { type: Boolean, default: true },
          headline: { type: String },
        },
        gallery: {
          enabled: { type: Boolean, default: true },
          headline: { type: String },
          subheadline: { type: String },
          instagram: {
            username: { type: String },
            link: { type: String },
            ctaText: { type: String },
          },
          treatments: {
            type: [
              {
                id: { type: String },
                category: { type: String },
                title: { type: String },
                description: { type: String },
                images: {
                  type: [
                    {
                      src: { type: String },
                      alt: { type: String },
                    },
                  ],
                  default: [],
                },
                href: { type: String, default: "/termini" },
              },
            ],
            default: [],
          },
          /** Flat image array for gallery sections (no treatment metadata). */
          images: {
            type: [{ src: { type: String }, alt: { type: String } }],
            default: [],
          },
        },
        faq: {
          enabled: { type: Boolean, default: true },
          headline: { type: String },
          subheadline: { type: String },
          support: {
            text: { type: String },
            email: { type: String },
          },
          items: { type: [faqItemSchema], default: [] },
        },
      },
      pages: {
        servicesPage: {
          headline: { type: String },
          subheadline: { type: String },
        },
        appointmentsPage: {
          headline: { type: String },
          subheadline: { type: String },
          ctas: {
            primary: ctaSchema,
            secondary: ctaSchema,
          },
        },
      },
    },

    logo: { type: String, required: false, default: null },
    phone: { type: String, required: false, default: "" },
    city: { type: String, required: false, default: "" },
    street: { type: String, required: false, default: "" },
    social: {
      instagram: { type: String, default: "" },
      facebook: { type: String, default: "" },
      tiktok: { type: String, default: "" },
      whatsapp: { type: String, default: "" },
      telegram: { type: String, default: "" },
    },
    newsletterEmail: { type: String, required: false, default: "" },
    contactEmail: { type: String, required: false, default: "" },
    marketingPhone: { type: String, required: false, default: "" },
    workingHours: { type: Object, default: {} },

    seo: {
      homeTitle: { type: String, default: "" },
      homeDescription: { type: String, default: "" },
      uslugeTitle: { type: String, default: "" },
      uslugeDescription: { type: String, default: "" },
      terminiTitle: { type: String, default: "" },
      terminiDescription: { type: String, default: "" },
    },

    branding: {
      primaryColor: { type: String, default: "#a855f7" },
      secondaryColor: { type: String, default: "#ec4899" },
      fontFamily: { type: String, default: "Inter" },
    },

    landingTheme: {
      type: String,
      enum: ["theme-1", "theme-2", "theme-3", "theme-4"],
      default: "theme-1",
    },
  },
  { timestamps: true },
);

if (process.env.NODE_ENV !== "production" && models.SalonProfile) {
  delete models.SalonProfile;
}

export const SalonProfile =
  models.SalonProfile || model("SalonProfile", SalonProfileSchema);
