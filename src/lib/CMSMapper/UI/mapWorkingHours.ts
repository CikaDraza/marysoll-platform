import { SalonProfileData } from "@/types";

export function mapWorkingHours(profile: SalonProfileData) {
  return {
    workingHours: profile.workingHours,
  };
}
