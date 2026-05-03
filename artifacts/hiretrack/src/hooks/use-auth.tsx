import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, LoginBody, RegisterBody, useGetMe, login as apiLogin, register as apiRegister, logout as apiLogout, setAuthTokenGetter } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: User["role"] | null;
  login: (data: LoginBody) => Promise<void>;
  register: (data: RegisterBody) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("accessToken"));
  const queryClient = useQueryClient();

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("accessToken"));
  }, []);

  const { data: user, isLoading: isUserLoading, error } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    }
  });

  const isAuthenticated = !!user;
  const role = user?.role || null;
  const isLoading = isUserLoading;

  const login = async (data: LoginBody) => {
    const res = await apiLogin(data);
    localStorage.setItem("accessToken", res.accessToken);
    localStorage.setItem("refreshToken", res.refreshToken);
    setToken(res.accessToken);
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  };

  const register = async (data: RegisterBody) => {
    const res = await apiRegister(data);
    localStorage.setItem("accessToken", res.accessToken);
    localStorage.setItem("refreshToken", res.refreshToken);
    setToken(res.accessToken);
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (e) {
      // Ignore
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      setToken(null);
      queryClient.clear();
    }
  };

  useEffect(() => {
    if (error) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      setToken(null);
    }
  }, [error]);

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, isAuthenticated, role, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
