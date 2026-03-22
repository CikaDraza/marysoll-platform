"use client";

import { useAuthInterceptor } from "@/hooks/useAuthInterceptor";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useAuthInterceptor();

  return <>{children}</>;
}
