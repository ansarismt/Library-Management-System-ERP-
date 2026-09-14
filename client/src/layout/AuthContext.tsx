import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

  // Prevent bootstrap/login/logout requests from overwriting
  // each other's authentication state.
  const authOperationRef = useRef(0);

  useEffect(() => {
    const operationId = ++authOperationRef.current;

    const bootstrapAuth = async () => {
      try {
        const storedToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);

        if (storedToken) {
          setAccessToken(storedToken);

          try {
            // Always get the complete current user from the server.
            const currentUser = await authApi.me();

            if (authOperationRef.current !== operationId) {
              return;
            }

            setUser(currentUser);
            return;
          } catch {
            if (authOperationRef.current !== operationId) {
              return;
            }

            sessionStorage.removeItem(ACCESS_TOKEN_KEY);
            setAccessToken(null);
          }
        }

        // No valid stored token — try refresh using the HTTP-only cookie.
        const response = await authApi.refresh();
        const newToken = response.data.data.accessToken;

        if (authOperationRef.current !== operationId) {
          return;
        }

        setAccessToken(newToken);
        sessionStorage.setItem(ACCESS_TOKEN_KEY, newToken);

        // Fetch the canonical user after refresh.
        const currentUser = await authApi.me();

        if (authOperationRef.current !== operationId) {
          return;
        }

        setUser(currentUser);
      } catch {
        if (authOperationRef.current !== operationId) {
          return;
        }

        setAccessToken(null);
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        setUser(null);
      } finally {
        if (authOperationRef.current === operationId) {
          setLoading(false);
        }
      }
    };

    void bootstrapAuth();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,

      login: async (email, password) => {
        // Invalidate any currently running bootstrap operation.
        const operationId = ++authOperationRef.current;

        setLoading(true);

        try {
          const { data } = await authApi.login({ email, password });
          const accessToken = data.data.accessToken;

          setAccessToken(accessToken);
          sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);

          // IMPORTANT:
          // Get the complete authenticated user from /me instead of
          // relying only on the login response.
          const currentUser = await authApi.me();

          // Make sure an older auth operation cannot overwrite this login.
          if (authOperationRef.current !== operationId) {
            return;
          }

          setUser(currentUser);
        } finally {
          if (authOperationRef.current === operationId) {
            setLoading(false);
          }
        }
      },

      logout: async () => {
        // Invalidate any pending auth operation.
        ++authOperationRef.current;

        try {
          await authApi.logout();
        } finally {
          setAccessToken(null);
          sessionStorage.removeItem(ACCESS_TOKEN_KEY);
          setUser(null);
          setLoading(false);
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