import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { authApi, Teacher } from "../services/api";

interface AuthState {
  token: string | null;
  teacher: Teacher | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    matricula: string;
    subjects: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  teacher: null,
  isLoading: true,
  isAuthenticated: false,

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

  logout: async () => {
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

// Store separado para admin
interface AdminAuthState {
  token: string | null;
  email: string | null;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
}

import { adminApi } from "../services/api";
import axios from "axios";

export const useAdminAuthStore = create<AdminAuthState>((set) => ({
  token: null,
  email: null,
  isAuthenticated: false,

  login: async (email, password) => {
    const { data } = await adminApi.login(email, password);
    await SecureStore.setItemAsync("admin_token", data.token);
    // Reconfigura header do axios para admin
    axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
    set({ token: data.token, email: data.email, isAuthenticated: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("admin_token");
    set({ token: null, email: null, isAuthenticated: false });
  },

  loadStoredAuth: async () => {
    const token = await SecureStore.getItemAsync("admin_token");
    if (token) {
      // Verifica se ainda é válido tentando uma rota admin
      try {
        // token existe, assume válido — será verificado na primeira request
        set({ token, isAuthenticated: true });
      } catch {
        await SecureStore.deleteItemAsync("admin_token");
      }
    }
  },
}));
