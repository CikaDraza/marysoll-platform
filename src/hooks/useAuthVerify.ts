import { api } from "@/lib/api";
import { useState } from "react";

export const useVerifyRegistration = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyToken = async (token: string) => {
    // Sprečavamo višestruke pozive ako se već učitava
    if (!token) {
      setError("Token nije pronađen u URL-u.");
      return;
    }

    setIsLoading(true);
    setError(null); // Čistimo prethodne greške

    try {
      // Pozivamo POST rutu i šaljemo token u body-ju
      await api.post("/auth/verify", { token });

      setIsSuccess(true);
    } catch (err: any) {
      console.error("Greška pri verifikaciji:", err);

      // Hvatamo tačnu grešku sa servera
      const errorMessage =
        err.response?.data?.error ||
        err.message ||
        "Došlo je do greške pri verifikaciji naloga.";

      setError(errorMessage);
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };
  return {
    verifyToken,
    isLoading,
    isSuccess,
    error,
  };
};
