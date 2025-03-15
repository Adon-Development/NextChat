import { create } from "zustand";
import { persist } from "zustand/middleware";

const API_URL = "https://vgcassistant.com";

export interface AuthConfig {
  token: string | null;
  username: string | null;
  isAuthenticated: boolean;
  baseUrl: string;
}

export interface AuthStore extends AuthConfig {
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  verify: () => Promise<boolean>;
  logout: () => void;
  setToken: (token: string) => void;
  setUsername: (username: string) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      token: null,
      username: null,
      isAuthenticated: false,
      baseUrl: "https://vgcassistant.com",

      setToken: (token: string) => {
        set({ token, isAuthenticated: true });
      },

      setUsername: (username: string) => {
        set({ username });
      },

      setBaseUrl: (url: string) => {
        set({ baseUrl: url });
      },

      login: async (username: string, password: string) => {
        try {
          const response = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Login failed");
          }

          const result = await response.json();
          set({
            token: result.token,
            username,
            isAuthenticated: true,
          });
        } catch (error) {
          console.error("Login error:", error);
          throw error;
        }
      },

      register: async (username: string, password: string) => {
        try {
          const response = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Registration failed");
          }

          const result = await response.json();
          return result;
        } catch (error) {
          console.error("Registration error:", error);
          throw error;
        }
      },

      verify: async () => {
        const token = get().token;
        if (!token) return false;

        try {
          const response = await fetch(`${API_URL}/auth/verify`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          });

          const isValid = response.ok;
          set({ isAuthenticated: isValid });
          return isValid;
        } catch (error) {
          console.error("Token verification error:", error);
          set({ isAuthenticated: false });
          return false;
        }
      },

      logout: () => {
        set({
          token: null,
          username: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: "auth-storage",
    },
  ),
);
