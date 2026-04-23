import axios from "axios";
import * as SecureStore from "expo-secure-store";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
const AUTHORIZED_EMAIL_DOMAINS = (
  process.env.EXPO_PUBLIC_AUTHORIZED_EMAIL_DOMAINS ||
  process.env.EXPO_PUBLIC_AUTHORIZED_EMAIL_DOMAIN ||
  "@educacao.mg.gov.br,@escola.com"
)
  .split(",")
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean)
  .map((domain) => (domain.startsWith("@") ? domain : `@${domain}`));

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
export type UserRole = "autorizado" | "visitante";

export interface Teacher {
  id: number;
  name: string;
  email: string;
  userRole: UserRole;
  matricula?: string | null;
  subjects?: string | null;
  createdAt: string;
}

interface ApiTeacher {
  id: number;
  name: string;
  email: string;
  userRole?: UserRole | null;
  matricula?: string | null;
  subjects?: string | null;
  createdAt: string;
}

function normalizeEmail(email?: string | null): string {
  return (email || "").trim().toLowerCase();
}

export function deriveUserRole(email?: string | null): UserRole {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return "visitante";
  if (normalizedEmail.endsWith("privaterelay.appleid.com")) return "visitante";
  return AUTHORIZED_EMAIL_DOMAINS.some((domain) => normalizedEmail.endsWith(domain))
    ? "autorizado"
    : "visitante";
}

function normalizeTeacher(teacher: ApiTeacher): Teacher {
  const email = normalizeEmail(teacher.email);
  const derivedRole = deriveUserRole(email);
  const backendRole = teacher.userRole === "autorizado" ? "autorizado" : "visitante";
  return {
    ...teacher,
    email,
    userRole: derivedRole === "autorizado" || backendRole === "autorizado"
      ? "autorizado"
      : "visitante",
    matricula: teacher.matricula ?? null,
    subjects: teacher.subjects ?? null,
  };
}

type AuthPayload = { token: string; teacher: ApiTeacher };

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
    api
      .post<AuthPayload>("/api/auth/login", { email, password })
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          teacher: normalizeTeacher(res.data.teacher),
        },
      })),

  register: (data: {
    name: string;
    email: string;
    password: string;
    matricula?: string;
    subjects?: string;
  }) =>
    api.post<AuthPayload>("/api/auth/register", data).then((res) => ({
      ...res,
      data: {
        ...res.data,
        teacher: normalizeTeacher(res.data.teacher),
      },
    })),

  me: () =>
    api.get<ApiTeacher>("/api/auth/me").then((res) => ({
      ...res,
      data: normalizeTeacher(res.data),
    })),

  googleLogin: (accessToken: string) =>
    api
      .post<AuthPayload | { requiresRegistration: true; name: string; email?: string | null }>(
        "/api/auth/google",
        { accessToken }
      )
      .then((res) => {
        const payload = res.data;
        if ("requiresRegistration" in payload) return res;
        return {
          ...res,
          data: {
            ...payload,
            teacher: normalizeTeacher(payload.teacher),
          },
        };
      }),

  googleComplete: (data: { accessToken: string; matricula?: string; subjects?: string }) =>
    api.post<AuthPayload>("/api/auth/google/complete", data).then((res) => ({
      ...res,
      data: {
        ...res.data,
        teacher: normalizeTeacher(res.data.teacher),
      },
    })),

  appleLogin: (data: {
    identityToken: string;
    authorizationCode?: string;
    fullName?: string | null;
    email?: string | null;
  }) =>
    api.post<AuthPayload>("/api/auth/apple", data).then((res) => ({
      ...res,
      data: {
        ...res.data,
        teacher: normalizeTeacher(res.data.teacher),
      },
    })),

  deleteAccount: () => api.delete("/api/auth/account"),

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
