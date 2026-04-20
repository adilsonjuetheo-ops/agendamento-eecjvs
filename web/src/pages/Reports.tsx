import { useEffect, useState } from "react";
import { api } from "../api";

const ROOM_COLORS: Record<string, string> = {
  "Sala de Informática":      "#3b82f6",
  "Laboratório de Ciências":  "#8b5cf6",
  "Quadra Poliesportiva":     "#f59e0b",
  "Biblioteca":               "#ec4899",
};

export default function Reports() {
  const [rooms, setRooms]       = useState<{ room: string; count: number }[]>([]);
  const [teachers, setTeachers] = useState<{ teacherName: string; count: number }[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([api.getRoomsReport(), api.getTeachersReport()])
      .then(([r, t]) => { setRooms(r); setTeachers(t); })
      .finally(() => setLoading(false));
  }, []);

  const maxRoom    = Math.max(...rooms.map((r) => r.count), 1);
  const maxTeacher = Math.max(...teachers.map((t) => t.count), 1);

  function handleExport() {
    window.open("/api/admin/reports/export", "_blank");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Relatórios</h1>
          <p className="text-gray-500 text-sm mt-1">Uso do mês atual</p>
        </div>
        <button
          onClick={handleExport}
          className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Exportar CSV completo
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Espaços */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Uso por espaço</h2>
            <p className="text-xs text-gray-500 mt-0.5">Mês atual</p>
          </div>
          <div className="p-6 space-y-4">
            {rooms.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Sem dados no mês</p>
            ) : (
              rooms.map((r) => (
                <div key={r.room}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 font-medium truncate flex-1 mr-2">{r.room}</span>
                    <span className="text-sm font-bold text-gray-800">{r.count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${(r.count / maxRoom) * 100}%`,
                        backgroundColor: ROOM_COLORS[r.room] ?? "#6b7280",
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Professores */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Professores mais ativos</h2>
            <p className="text-xs text-gray-500 mt-0.5">Total de reservas ativas</p>
          </div>
          <div className="p-6 space-y-3">
            {teachers.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Sem dados</p>
            ) : (
              teachers.map((t, i) => (
                <div key={t.teacherName} className="flex items-center gap-3">
                  <span className="text-gray-400 text-xs w-5 text-right">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700 font-medium truncate">{t.teacherName}</span>
                      <span className="text-sm font-bold text-gray-800 ml-2">{t.count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-1.5 rounded-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${(t.count / maxTeacher) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
