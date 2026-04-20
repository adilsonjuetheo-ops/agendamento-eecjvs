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

export const SPECIAL_DATE_TYPES = [
  "feriado",
  "recesso",
  "ferias",
  "sabado_letivo",
  "inicio_trimestre",
  "fim_trimestre",
  "conselho_classe",
  "reuniao_pais",
  "dia_letivo_especial",
  "censo_escolar",
] as const;

export type SpecialDateType = (typeof SPECIAL_DATE_TYPES)[number];

export const TYPE_CONFIG: Record<SpecialDateType, { label: string; color: string; icon: string; blocking: boolean }> = {
  feriado:            { label: "Feriado Nacional",      color: "#ef4444", icon: "🔴", blocking: true  },
  ferias:             { label: "Férias Escolares",       color: "#f97316", icon: "🏖️", blocking: true  },
  recesso:            { label: "Recesso",                color: "#f59e0b", icon: "⏸️", blocking: false },
  sabado_letivo:      { label: "Sábado Letivo",          color: "#3b82f6", icon: "📚", blocking: false },
  inicio_trimestre:   { label: "Início do Trimestre",    color: "#10b981", icon: "🟢", blocking: false },
  fim_trimestre:      { label: "Término do Trimestre",   color: "#6366f1", icon: "🔵", blocking: false },
  conselho_classe:    { label: "Conselho de Classe",     color: "#8b5cf6", icon: "👥", blocking: false },
  reuniao_pais:       { label: "Reunião de Pais",        color: "#ec4899", icon: "👨‍👩‍👧", blocking: false },
  dia_letivo_especial:{ label: "Dia Letivo Especial",    color: "#14b8a6", icon: "⭐", blocking: false },
  censo_escolar:      { label: "Censo Escolar",          color: "#64748b", icon: "📊", blocking: false },
};

// Datas especiais
export const specialDatesApi = {
  getAll: () => api.get<SpecialDate[]>("/api/special-dates"),
};

