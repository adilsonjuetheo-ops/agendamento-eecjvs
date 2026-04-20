import { useEffect, useState } from "react";
import { api, Teacher } from "../api";

export default function Teachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.getTeachers().then(setTeachers).finally(() => setLoading(false));
  }, []);

  const filtered = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      t.matricula.includes(search)
  );

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("pt-BR");
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Professores</h1>
        <p className="text-gray-500 text-sm mt-1">{teachers.length} professor(es) cadastrado(s)</p>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nome, e-mail ou MASP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">Nenhum professor encontrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 text-gray-500 font-medium">Nome</th>
                  <th className="px-4 py-3 text-gray-500 font-medium">E-mail</th>
                  <th className="px-4 py-3 text-gray-500 font-medium">MASP</th>
                  <th className="px-4 py-3 text-gray-500 font-medium">Disciplinas</th>
                  <th className="px-4 py-3 text-gray-500 font-medium">Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-800">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{t.email}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono">{t.matricula}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{t.subjects}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(t.createdAt)}</td>
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
