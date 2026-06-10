"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Theme = "light" | "dark";
type ThemeContextType = { theme: Theme; toggleTheme: () => void };

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  // Routes that force a fixed theme regardless of the user's saved preference.
  //  - /superadmin  → always dark
  //  - /newsletter  → always light (public platform landings)
  const forcedTheme: Theme | null = pathname?.startsWith("/superadmin")
    ? "dark"
    : pathname?.startsWith("/newsletter")
      ? "light"
      : null;

  // Load saved preference once.
  useEffect(() => {
    function init() {
      const saved = localStorage.getItem("marysoll-theme") as Theme | null;
      setTheme(saved ?? "light");
      setReady(true);
    }
    init();
  }, []);

  // Apply the effective theme to <html>. Forced routes win and are NOT persisted,
  // so the user's own preference is restored once they leave the forced route.
  // Depends on `forcedTheme` (derived from pathname) so it re-applies on client nav.
  useEffect(() => {
    if (!ready) return;
    const effective = forcedTheme ?? theme;
    document.documentElement.classList.toggle("dark", effective === "dark");
    if (!forcedTheme) localStorage.setItem("marysoll-theme", theme);
  }, [theme, ready, forcedTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme: forcedTheme ?? theme,
        toggleTheme: () => {
          if (forcedTheme) return; // theme is locked on forced routes
          setTheme((p) => (p === "light" ? "dark" : "light"));
        },
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
