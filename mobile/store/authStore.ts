import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { authApi, Teacher } from "../services/api";

interface AuthState {
  token: string | null;
  teacher: Teacher | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  pendingGoogleToken: string | null;
  pendingGoogleName: string | null;
  pendingGoogleEmail: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    matricula: string;
    subjects: string;
  }) => Promise<void>;
  loginWithGoogle: (accessToken: string) => Promise<{ requiresRegistration: boolean }>;
  completeGoogleRegistration: (matricula: string, subjects: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  teacher: null,
  isLoading: true,
  isAuthenticated: false,
  pendingGoogleToken: null,
  pendingGoogleName: null,
  pendingGoogleEmail: null,

  login: async (email, password) => {
    const { data } = await authApi.login(email, password);
    await SecureStore.setItemAsync("auth_token", data.token);
    set({ token: data.token, teacher: data.teacher, isAuthenticated: true });
  },

  register: async (data) => {
    const { data: res } = await authApi.register(data);
    await SecureStore.setItemAsync("auth_token", res.token);
    set({ token: res.token, teacher: res.teacher, isAuthenticated: true });
  },

  loginWithGoogle: async (accessToken) => {
    const { data } = await authApi.googleLogin(accessToken);
    if ("requiresRegistration" in data && data.requiresRegistration) {
      set({
        pendingGoogleToken: accessToken,
        pendingGoogleName: data.name,
        pendingGoogleEmail: data.email,
      });
      return { requiresRegistration: true };
    }
    const res = data as { token: string; teacher: Teacher };
    await SecureStore.setItemAsync("auth_token", res.token);
    set({ token: res.token, teacher: res.teacher, isAuthenticated: true });
    return { requiresRegistration: false };
  },

  completeGoogleRegistration: async (matricula, subjects) => {
    const { pendingGoogleToken } = get();
    if (!pendingGoogleToken) throw new Error("Sessão Google expirada");
    const { data } = await authApi.googleComplete({
      accessToken: pendingGoogleToken,
      matricula,
      subjects,
    });
    await SecureStore.setItemAsync("auth_token", data.token);
    set({
      token: data.token,
      teacher: data.teacher,
      isAuthenticated: true,
      pendingGoogleToken: null,
      pendingGoogleName: null,
      pendingGoogleEmail: null,
    });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("auth_token");
    set({ token: null, teacher: null, isAuthenticated: false });
  },

  deleteAccount: async () => {
    await authApi.deleteAccount();
    await SecureStore.deleteItemAsync("auth_token");
    set({ token: null, teacher: null, isAuthenticated: false });
  },

  loadStoredAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync("auth_token");
      if (token) {
        const { data: teacher } = await authApi.me();
        set({ token, teacher, isAuthenticated: true });
      }
    } catch {
      await SecureStore.deleteItemAsync("auth_token");
      set({ token: null, teacher: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  refreshMe: async () => {
    const { data } = await authApi.me();
    set({ teacher: data });
  },
}));

