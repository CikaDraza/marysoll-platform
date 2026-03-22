export interface UpsertSalonProfileDto {
  logoUrl?: string;
  phone?: string;
  address?: string;
  social?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  };
  newsletterEmail?: string;
}
