// context/AuthContext.tsx
"use client";
import { createContext, useContext, ReactNode } from "react";
import { getUserFromToken } from "@/lib/auth/auth-client";
import { LoggedInUser } from "@/types/auth/types";

interface AuthContextType {
  token: string | null;
  user: LoggedInUser | null;
}

const AuthContext = createContext<AuthContextType>({ token: null, user: null });

export const AuthProvider = ({
  children,
  token,
}: {
  children: ReactNode;
  token: string | null;
}) => {
  const isValidToken = token && token !== "null" && token !== "undefined";
  // getUserFromToken with explicit token arg (avoids localStorage read in SSR)
  const decoded = isValidToken ? getUserFromToken(token) : null;

  const user: LoggedInUser | null = decoded
    ? {
        id:      decoded.id,
        email:   decoded.email,
        name:    decoded.name,
        isAdmin: decoded.isAdmin,
        token:   token!,
        isOnline: decoded.isOnline,
      }
    : null;

  return (
    <AuthContext.Provider value={{ token, user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
