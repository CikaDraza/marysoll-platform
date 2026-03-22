"use client";

import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import getApiError from "@/helpers/getApiError";

interface ResendVerificationResult {
  success: boolean;
  message?: string;
  error?: string;
}

export function useResendVerification() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ResendVerificationResult | null>(null);

  const resendVerification = useCallback(
    async (email: string): Promise<ResendVerificationResult> => {
      if (!email.trim()) {
        const err = { success: false, error: "Email je obavezan." };
        setResult(err);
        toast.error(err.error);
        return err;
      }

      setIsLoading(true);
      setResult(null);

      try {
        const response = await api.post("/auth/resend-verification", { email });

        const successResult = {
          success: true,
          message:
            response.data.message ||
            "Proverite vaš email sanduče (uključujući spam folder).",
        };

        setResult(successResult);
        toast.success(successResult.message);
        return successResult;
      } catch (err) {
        const errorMessage = getApiError(err);
        const errorResult = { success: false, error: errorMessage };
        setResult(errorResult);
        toast.error(errorMessage);
        return errorResult;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return {
    resendVerification,
    isLoading,
    result,
  };
}
