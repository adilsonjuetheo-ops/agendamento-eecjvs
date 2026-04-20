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

export interface Teacher {
  id: number;
  name: string;
  email: string;
  matricula: string;
  subjects: string;
  createdAt: string;
}

export interface SpecialDate {
  id: number;
  date: string;
  type: string;
  label: string;
}

export interface Stats {
  today: number;
  week: number;
  month: number;
  total: number;
}

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

export const TYPE_CONFIG: Record<SpecialDateType, { label: string; color: string; blocking: boolean }> = {
  feriado:             { label: "Feriado Nacional",      color: "#ef4444", blocking: true  },
  ferias:              { label: "Férias Escolares",       color: "#f97316", blocking: true  },
  recesso:             { label: "Recesso",                color: "#f59e0b", blocking: false },
  sabado_letivo:       { label: "Sábado Letivo",          color: "#3b82f6", blocking: false },
  inicio_trimestre:    { label: "Início do Trimestre",    color: "#10b981", blocking: false },
  fim_trimestre:       { label: "Término do Trimestre",   color: "#6366f1", blocking: false },
  conselho_classe:     { label: "Conselho de Classe",     color: "#8b5cf6", blocking: false },
  reuniao_pais:        { label: "Reunião de Pais",        color: "#ec4899", blocking: false },
  dia_letivo_especial: { label: "Dia Letivo Especial",    color: "#14b8a6", blocking: false },
  censo_escolar:       { label: "Censo Escolar",          color: "#64748b", blocking: false },
};

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = localStorage.getItem("admin_token");
  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    const data = await res.json().catch(() => ({}));
    const msg = (data as { error?: string }).error || "Credenciais inválidas";
    // Só redireciona se havia token (sessão expirada), não no login em si
    if (localStorage.getItem("admin_token")) {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_email");
      window.location.href = "/admin/login";
    }
    throw new Error(msg);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || "Erro na requisição");
  }

  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; email: string }>("POST", "/api/admin/login", { email, password }),

  // Stats
  getStats: () => request<Stats>("GET", "/api/admin/stats"),

  // Reservations
  getReservations: (params?: { room?: string; status?: string; startDate?: string; endDate?: string }) => {
    const qs = new URLSearchParams();
    if (params?.room) qs.set("room", params.room);
    if (params?.status) qs.set("status", params.status);
    if (params?.startDate) qs.set("startDate", params.startDate);
    if (params?.endDate) qs.set("endDate", params.endDate);
    const q = qs.toString();
    return request<Reservation[]>("GET", `/api/admin/reservations${q ? `?${q}` : ""}`);
  },

  updateReservation: (id: number, status: "cancelado" | null) =>
    request<Reservation>("PATCH", `/api/admin/reservations/${id}`, { status }),

  deleteReservation: (id: number) =>
    request<void>("DELETE", `/api/admin/reservations/${id}`),

  // Teachers
  getTeachers: () => request<Teacher[]>("GET", "/api/admin/teachers"),

  createTeacher: (data: { name: string; email: string; matricula: string; subjects: string; password: string }) =>
    request<Teacher>("POST", "/api/admin/teachers", data),

  deleteTeacher: (id: number) =>
    request<void>("DELETE", `/api/admin/teachers/${id}`),

  // Calendar
  getCalendar: () => request<SpecialDate[]>("GET", "/api/admin/special-dates"),

  createCalendarEntry: (data: { date: string; type: SpecialDateType; label: string }) =>
    request<SpecialDate>("POST", "/api/admin/special-dates", data),

  deleteCalendarEntry: (id: number) =>
    request<void>("DELETE", `/api/admin/special-dates/${id}`),

  importCalendar: (entries: { date: string; type: SpecialDateType; label: string }[]) =>
    request<{ imported: number }>("POST", "/api/admin/special-dates/import", entries),

  clearCalendarYear: (year: number) =>
    request<{ deleted: number }>("DELETE", `/api/admin/special-dates/year/${year}`),

  // Reports
  getRoomsReport: () => request<{ room: string; count: number }[]>("GET", "/api/admin/reports/rooms"),
  getTeachersReport: () => request<{ teacherName: string; count: number }[]>("GET", "/api/admin/reports/teachers"),
};
