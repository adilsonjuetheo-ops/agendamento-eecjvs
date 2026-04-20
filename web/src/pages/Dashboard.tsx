import { useEffect, useState } from "react";
import { api, Stats, Reservation } from "../api";

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <p className="text-gray-500 text-sm">{label}</p>
      <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
    </div>
  );
}

const ROOM_COLORS: Record<string, string> = {
  "Sala de Informática":      "#3b82f6",
  "Laboratório de Ciências":  "#8b5cf6",
  "Quadra Poliesportiva":     "#f59e0b",
  "Biblioteca":               "#ec4899",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [today, setToday] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    Promise.all([
      api.getStats(),
      api.getReservations({ startDate: todayStr, endDate: todayStr }),
    ]).then(([s, r]) => {
      setStats(s);
      setToday(r);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Hoje"       value={stats?.today  ?? 0} color="#3b82f6" />
        <StatCard label="Esta semana" value={stats?.week   ?? 0} color="#8b5cf6" />
        <StatCard label="Este mês"   value={stats?.month  ?? 0} color="#f59e0b" />
        <StatCard label="Total"      value={stats?.total  ?? 0} color="#10b981" />
      </div>

      {/* Reservas de hoje */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Reservas de hoje</h2>
        </div>
        {today.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">
            Nenhuma reserva hoje
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {today.map((r) => (
              <div key={r.id} className="flex items-center px-6 py-4 gap-4">
                <div
                  className="w-1 h-10 rounded-full flex-shrink-0"
                  style={{ backgroundColor: ROOM_COLORS[r.room] ?? "#6b7280" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{r.room}</p>
                  <p className="text-gray-500 text-xs truncate">{r.teacherName} · {r.subject}</p>
                </div>
                <span className="text-gray-500 text-sm whitespace-nowrap">
                  {fmt(r.startTime)} – {fmt(r.endTime)}
                </span>
                {r.status === "cancelado" && (
                  <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">Cancelado</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
