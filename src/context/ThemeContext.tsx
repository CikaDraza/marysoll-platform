"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { usePathname } from "next/navigation";

type Theme = "light" | "dark";
type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
  /** Route-scoped override: pass a theme to lock it, or null to release. */
  setForcedTheme: (theme: Theme | null) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>("light");
  const [forced, setForced] = useState<Theme | null>(null);
  const [ready, setReady] = useState(false);

  // Path-based forced themes (highest priority):
  //  - /superadmin → always dark
  //  - /newsletter → always light (public platform landings)
  const pathForcedTheme: Theme | null = pathname?.startsWith("/superadmin")
    ? "dark"
    : pathname?.startsWith("/newsletter")
      ? "light"
      : null;

  // Effective override = path rule, else whatever a subtree requested
  // (e.g. public tenant pages force light via <TenantThemeController />).
  const forcedTheme = pathForcedTheme ?? forced;

  const setForcedTheme = useCallback((t: Theme | null) => setForced(t), []);

  // Load saved preference once.
  useEffect(() => {
    function init() {
      const saved = localStorage.getItem("marysoll-theme") as Theme | null;
      setTheme(saved ?? "light");
      setReady(true);
    }
    init();
  }, []);

  // Apply the effective theme to <html>. Forced themes win and are NOT persisted,
  // so the user's own preference is restored once the override is released.
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
          if (forcedTheme) return; // theme is locked while an override is active
          setTheme((p) => (p === "light" ? "dark" : "light"));
        },
        setForcedTheme,
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
