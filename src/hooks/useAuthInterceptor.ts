"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useAuthInterceptor() {
  const router = useRouter();

  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const [resource, config] = args;

      const response = await originalFetch(resource, config);

      if (response.status === 401) {
        try {
          const refreshResponse = await fetch("/api/auth/refresh", {
            method: "POST",
            credentials: "include",
          });

          if (refreshResponse.ok) {
            const { token } = await refreshResponse.json();
            localStorage.setItem("token", token);

            // Ponovi originalni zahtev
            if (config && config.headers) {
              const newConfig = {
                ...config,
                headers: {
                  ...config.headers,
                  Authorization: `Bearer ${token}`,
                },
              };
              return originalFetch(resource, newConfig);
            }
          } else {
            localStorage.removeItem("token");
            router.push("/login");
          }
        } catch (error) {
          console.error("Auth interceptor error:", error);
          localStorage.removeItem("token");
          router.push("/login");
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [router]);
}
