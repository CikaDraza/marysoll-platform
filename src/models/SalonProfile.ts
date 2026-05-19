import mongoose, { model, models, Types } from "mongoose";

export type LandingTheme =
  | "theme-1"
  | "theme-2"
  | "theme-3"
  | "theme-4"
  | "theme-5"
  | "theme-6";

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
          links: {
            type: [
              {
                text: { type: String },
                url: { type: String },
                type: {
                  type: String,
                  enum: ["link", "mention", "tag"],
                  default: "link",
                },
              },
            ],
            default: [],
          },
          image: {
            src: { type: String },
            alt: { type: String },
          },
        },
        artists: {
          enabled: { type: Boolean, default: true },
          headline: { type: String },
          members: {
            type: [
              {
                name: { type: String },
                role: { type: String },
                bio: { type: String },
                image: {
                  src: { type: String },
                  alt: { type: String },
                },
              },
            ],
            default: [],
          },
        },
        servicesPreview: {
          enabled: { type: Boolean, default: true },
          headline: { type: String },
          subheadline: { type: String },
          showIcons: { type: Boolean, default: true },
          image: {
            src: { type: String },
            alt: { type: String },
          },
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
          /**
           * Mirrors THEME_CONFIG[landingTheme].gallery.variant.
           * "images-only"          → flat `images` array (masonry — themes 3/4/5)
           * "images-with-category" → `treatments` array (zigzag — themes 1/2)
           */
          galleryVariant: {
            type: String,
            enum: ["images-only", "images-with-category"],
            default: "images-with-category",
          },
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
        blog: {
          enabled: { type: Boolean, default: false },
          headline: { type: String },
          paragraph: { type: String },
        },
      },
      pages: {
        servicesPage: {
          headline: { type: String },
          subheadline: { type: String },
          paragraph: { type: String },
        },
        appointmentsPage: {
          headline: { type: String },
          subheadline: { type: String },
          paragraph: { type: String },
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
    lat: { type: Number, required: false, default: null },
    lng: { type: Number, required: false, default: null },
    social: {
      instagram: { type: String, default: "" },
      facebook: { type: String, default: "" },
      tiktok: { type: String, default: "" },
      whatsapp: { type: String, default: "" },
      telegram: { type: String, default: "" },
    },
    newsletterEmail: { type: String, required: false, default: "" },
    contactEmail: { type: String, required: false, default: "" },
    resendApiKey: { type: String, required: false, default: "" },
    marketingPhone: { type: String, required: false, default: "" },
    workingHours: { type: Object, default: {} },
    cancellationWindowHours: { type: Number, default: 1, min: 0 },

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
      enum: ["theme-1", "theme-2", "theme-3", "theme-4", "theme-5", "theme-6"],
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
