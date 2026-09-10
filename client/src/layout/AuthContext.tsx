import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/services";
import { setAccessToken } from "../api/client";
import type { Permission, User } from "../types";
import { ROLE_PERMISSIONS } from "../utils/permissions";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: Permission) => boolean;
};

const ACCESS_TOKEN_KEY = "library_access_token";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const storedToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);

        if (storedToken) {
          setAccessToken(storedToken);

          try {
            const currentUser = await authApi.me();
            setUser(currentUser);
            return;
          } catch {
            sessionStorage.removeItem(ACCESS_TOKEN_KEY);
            setAccessToken(null);
          }
        }

        const response = await authApi.refresh();
        const newToken = response.data.data.accessToken;

        setAccessToken(newToken);
        sessionStorage.setItem(ACCESS_TOKEN_KEY, newToken);

        const currentUser = await authApi.me();
        setUser(currentUser);
      } catch {
        setAccessToken(null);
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    void bootstrapAuth();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,

      login: async (email, password) => {
        const { data } = await authApi.login({ email, password });
        const accessToken = data.data.accessToken;

        setAccessToken(accessToken);
        sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        setUser(data.data.user);
      },

      logout: async () => {
        try {
          await authApi.logout();
        } finally {
          setAccessToken(null);
          sessionStorage.removeItem(ACCESS_TOKEN_KEY);
          setUser(null);
        }
      },

      can: (permission) =>
        !!user && ROLE_PERMISSIONS[user.role]?.includes(permission),
    }),
    [user, loading],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}