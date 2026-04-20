import { useEffect, useState } from "react";
import { api, Teacher } from "../api";

export default function Teachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", matricula: "", subjects: "", password: "" });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // Delete
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  async function handleAdd(e: { preventDefault(): void }) {
    e.preventDefault();
    setAddError("");
    setAddLoading(true);
    try {
      const created = await api.createTeacher(form);
      setTeachers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setShowAdd(false);
      setForm({ name: "", email: "", matricula: "", subjects: "", password: "" });
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Erro ao cadastrar");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleDelete(t: Teacher) {
    if (!confirm(`Remover o professor "${t.name}"? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(t.id);
    try {
      await api.deleteTeacher(t.id);
      setTeachers((prev) => prev.filter((x) => x.id !== t.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao remover");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Professores</h1>
          <p className="text-gray-500 text-sm mt-1">{teachers.length} professor(es) cadastrado(s)</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setAddError(""); }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Novo professor
        </button>
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
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((t) => (
                  <tr key={t.id} className="group">
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
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(t)}
                        disabled={deletingId === t.id}
                        className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 text-sm font-medium disabled:opacity-50"
                      >
                        {deletingId === t.id ? "..." : "Remover"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Novo Professor */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-gray-800">Novo Professor</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Nome completo</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Maria da Silva"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="maria@educacao.mg.gov.br"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">MASP</label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={form.matricula}
                  onChange={(e) => setForm({ ...form, matricula: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1234567"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Disciplinas</label>
                <input
                  type="text"
                  required
                  value={form.subjects}
                  onChange={(e) => setForm({ ...form, subjects: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Matemática, Física"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Senha</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="mínimo 6 caracteres"
                />
              </div>
              {addError && <p className="text-red-500 text-sm">{addError}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg py-2.5 text-sm font-medium"
                >
                  {addLoading ? "Salvando..." : "Cadastrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
