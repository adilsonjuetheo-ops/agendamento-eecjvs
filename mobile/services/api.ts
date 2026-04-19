import axios from "axios";
import * as SecureStore from "expo-secure-store";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Injeta token automaticamente em todas as requests
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Tipos de resposta
export interface Teacher {
  id: number;
  name: string;
  email: string;
  matricula: string;
  subjects: string;
  createdAt: string;
}

export interface Reservation {
  id: number;
  teacherId: number;
  teacherName: string;
  subject: string;
  room: string;
  startTime: string;
  endTime: string;
  status: string | null;
  createdAt: string;
}

export interface SpecialDate {
  id: number;
  date: string;
  type: string;
  label: string;
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; teacher: Teacher }>("/api/auth/login", { email, password }),

  register: (data: {
    name: string;
    email: string;
    password: string;
    matricula: string;
    subjects: string;
  }) => api.post<{ token: string; teacher: Teacher }>("/api/auth/register", data),

  me: () => api.get<Teacher>("/api/auth/me"),

  resetPassword: (data: {
    matricula: string;
    newPassword: string;
    confirmPassword: string;
  }) => api.post("/api/auth/reset-password", data),
};

// Reservas
export const reservationsApi = {
  getAll: () => api.get<Reservation[]>("/api/reservations"),

  getMy: () => api.get<Reservation[]>("/api/reservations/my"),

  create: (data: {
    room: string;
    subject: string;
    startTime: string;
    endTime: string;
  }) => api.post<Reservation>("/api/reservations", data),

  cancel: (id: number) => api.delete<Reservation>(`/api/reservations/${id}`),

  checkAvailability: (params: {
    startTime: string;
    endTime: string;
    room: string;
  }) =>
    api.get<{ available: boolean; reason?: string }>(
      "/api/reservations/check-availability",
      { params }
    ),
};

// Datas especiais
export const specialDatesApi = {
  getAll: () => api.get<SpecialDate[]>("/api/special-dates"),
};

// Admin
export const adminApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; email: string }>("/api/admin/login", { email, password }),

  getStats: () =>
    api.get<{ today: number; week: number; month: number; total: number }>(
      "/api/admin/stats"
    ),

  getReservations: (params?: {
    room?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }) => api.get<Reservation[]>("/api/admin/reservations", { params }),

  updateReservation: (id: number, status: "cancelado" | null) =>
    api.patch<Reservation>(`/api/admin/reservations/${id}`, { status }),

  deleteReservation: (id: number) =>
    api.delete(`/api/admin/reservations/${id}`),

  getTeachers: () => api.get<Teacher[]>("/api/admin/teachers"),

  getRoomsReport: () =>
    api.get<{ room: string; count: number }[]>("/api/admin/reports/rooms"),

  getTeachersReport: () =>
    api.get<{ teacherName: string; count: number }[]>("/api/admin/reports/teachers"),
};
