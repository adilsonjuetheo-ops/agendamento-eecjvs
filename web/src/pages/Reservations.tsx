import { useEffect, useState } from "react";
import { api, Reservation } from "../api";

const ROOMS = [
  "Sala de Informática",
  "Laboratório de Ciências",
  "Quadra Poliesportiva",
  "Biblioteca",
];

const ROOM_COLORS: Record<string, string> = {
  "Sala de Informática":      "#3b82f6",
  "Laboratório de Ciências":  "#8b5cf6",
  "Quadra Poliesportiva":     "#f59e0b",
  "Biblioteca":               "#ec4899",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function Reservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRoom, setFilterRoom] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getReservations({
        room: filterRoom || undefined,
        status: filterStatus || undefined,
      });
      setReservations(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterRoom, filterStatus]);

  async function handleToggleCancel(r: Reservation) {
    setActionId(r.id);
    try {
      const newStatus = r.status === "cancelado" ? null : "cancelado";
      const updated = await api.updateReservation(r.id, newStatus);
      setReservations((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Excluir permanentemente esta reserva?")) return;
    setActionId(id);
    try {
      await api.deleteReservation(id);
      setReservations((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Reservas</h1>
        <p className="text-gray-500 text-sm mt-1">{reservations.length} resultado(s)</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select
          value={filterRoom}
          onChange={(e) => setFilterRoom(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os espaços</option>
          {ROOMS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="cancelado">Cancelado</option>
        </select>

        <button
          onClick={load}
          className="ml-auto bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Atualizar
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reservations.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">Nenhuma reserva encontrada</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 text-gray-500 font-medium">Espaço</th>
                  <th className="px-4 py-3 text-gray-500 font-medium">Professor</th>
                  <th className="px-4 py-3 text-gray-500 font-medium">Disciplina / Turma</th>
                  <th className="px-4 py-3 text-gray-500 font-medium">Início</th>
                  <th className="px-4 py-3 text-gray-500 font-medium">Fim</th>
                  <th className="px-4 py-3 text-gray-500 font-medium">Status</th>
                  <th className="px-4 py-3 text-gray-500 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reservations.map((r) => (
                  <tr key={r.id} className={r.status === "cancelado" ? "opacity-60" : ""}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ROOM_COLORS[r.room] ?? "#6b7280" }} />
                        <span className="text-gray-700 font-medium">{r.room}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.teacherName}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{r.subject}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(r.startTime)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(r.endTime)}</td>
                    <td className="px-4 py-3">
                      {r.status === "cancelado" ? (
                        <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-medium">Cancelado</span>
                      ) : (
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">Ativo</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleToggleCancel(r)}
                          disabled={actionId === r.id}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-40"
                        >
                          {r.status === "cancelado" ? "Restaurar" : "Cancelar"}
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          disabled={actionId === r.id}
                          className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-40"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
