import { useEffect, useState } from "react";
import { api, SpecialDate, SpecialDateType, SPECIAL_DATE_TYPES, TYPE_CONFIG } from "../api";

const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

const CURRENT_YEAR = new Date().getFullYear();

function parseCsv(text: string): { date: string; type: SpecialDateType; label: string }[] {
  const lines = text.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  const entries: { date: string; type: SpecialDateType; label: string }[] = [];
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;

  for (const line of lines) {
    if (line.startsWith("data") || line.startsWith("//")) continue;
    const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
    if (parts.length < 3) continue;
    const [date, type, label] = parts;
    if (!dateRe.test(date)) continue;
    if (!(SPECIAL_DATE_TYPES as readonly string[]).includes(type)) continue;
    if (!label) continue;
    entries.push({ date, type: type as SpecialDateType, label });
  }
  return entries;
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", weekday: "short" });
}

export default function Calendar() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [allDates, setAllDates] = useState<SpecialDate[]>([]);
  const [loading, setLoading] = useState(true);

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [addDate, setAddDate] = useState("");
  const [addType, setAddType] = useState<SpecialDateType>("feriado");
  const [addLabel, setAddLabel] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // Import modal
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvPreview, setCsvPreview] = useState<{ date: string; type: SpecialDateType; label: string }[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");

  useEffect(() => {
    api.getCalendar().then(setAllDates).finally(() => setLoading(false));
  }, []);

  const availableYears = [
    ...new Set([CURRENT_YEAR, CURRENT_YEAR + 1, ...allDates.map((d) => new Date(d.date + "T12:00:00").getFullYear())]),
  ].sort();

  const yearDates = allDates
    .filter((d) => d.date.startsWith(String(year)))
    .sort((a, b) => a.date.localeCompare(b.date));

  const byMonth: Record<number, SpecialDate[]> = {};
  yearDates.forEach((d) => {
    const m = new Date(d.date + "T12:00:00").getMonth();
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(d);
  });

  async function handleDelete(id: number, label: string) {
    if (!confirm(`Remover "${label}"?`)) return;
    try {
      await api.deleteCalendarEntry(id);
      setAllDates((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao remover");
    }
  }

  async function handleClearYear() {
    if (!confirm(`Remover TODOS os eventos de ${year}? Esta ação não pode ser desfeita.`)) return;
    try {
      const result = await api.clearCalendarYear(year);
      setAllDates((prev) => prev.filter((d) => !d.date.startsWith(String(year))));
      alert(`${result.deleted} evento(s) removido(s).`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao limpar");
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(addDate)) { setAddError("Data inválida. Use AAAA-MM-DD"); return; }
    setAddLoading(true);
    try {
      const created = await api.createCalendarEntry({ date: addDate, type: addType, label: addLabel });
      setAllDates((prev) => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)));
      setShowAdd(false);
      setAddDate(""); setAddLabel("");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Erro ao adicionar");
    } finally {
      setAddLoading(false);
    }
  }

  function handlePreviewCsv() {
    setImportError("");
    const entries = parseCsv(csvText);
    if (entries.length === 0) { setImportError("Nenhum dado válido encontrado. Verifique o formato."); return; }
    setCsvPreview(entries);
  }

  async function handleImport() {
    if (csvPreview.length === 0) { handlePreviewCsv(); return; }
    setImportLoading(true);
    setImportError("");
    try {
      const result = await api.importCalendar(csvPreview);
      await api.getCalendar().then(setAllDates);
      setShowImport(false);
      setCsvText(""); setCsvPreview([]);
      alert(`${result.imported} evento(s) importado(s) com sucesso!`);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Erro na importação");
    } finally {
      setImportLoading(false);
    }
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
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Calendário Escolar</h1>
          <p className="text-gray-500 text-sm mt-1">{yearDates.length} evento(s) em {year}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Importar CSV
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Novo evento
          </button>
        </div>
      </div>

      {/* Seletor de ano */}
      <div className="flex items-center gap-2 mb-6">
        {availableYears.map((y) => (
          <button
            key={y}
            onClick={() => setYear(y)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              year === y
                ? "bg-blue-600 border-blue-600 text-white"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {y}
          </button>
        ))}
        {yearDates.length > 0 && (
          <button
            onClick={handleClearYear}
            className="ml-auto text-sm text-red-500 hover:text-red-700 font-medium"
          >
            Limpar {year}
          </button>
        )}
      </div>

      {/* Legenda */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
        <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Tipos de evento</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {(Object.entries(TYPE_CONFIG) as [SpecialDateType, typeof TYPE_CONFIG[SpecialDateType]][]).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
              <span className="text-xs text-gray-600">{cfg.label}</span>
              {cfg.blocking && <span className="text-xs text-red-400">(bloqueia)</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Calendário por mês */}
      {yearDates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 py-20 text-center">
          <p className="text-gray-400 text-4xl mb-3">📅</p>
          <p className="text-gray-500">Nenhum evento cadastrado para {year}</p>
          <button
            onClick={() => setShowImport(true)}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg"
          >
            Importar CSV
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {MONTHS.map((monthName, idx) => {
            const events = byMonth[idx];
            if (!events || events.length === 0) return null;
            return (
              <div key={idx} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <p className="font-semibold text-gray-700 text-sm">{monthName}</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {events.map((evt) => {
                    const cfg = TYPE_CONFIG[evt.type as SpecialDateType] ?? { label: evt.type, color: "#6b7280", blocking: false };
                    return (
                      <div key={evt.id} className="flex items-center px-4 py-2.5 gap-3 group">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-800 text-sm font-medium truncate">{evt.label}</p>
                          <p className="text-xs" style={{ color: cfg.color }}>{fmtDate(evt.date)} · {cfg.label}</p>
                        </div>
                        <button
                          onClick={() => handleDelete(evt.id, evt.label)}
                          className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 text-lg leading-none"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Adicionar */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-gray-800">Novo Evento</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Data (AAAA-MM-DD)</label>
                <input
                  type="date"
                  required
                  value={addDate}
                  onChange={(e) => setAddDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tipo</label>
                <select
                  value={addType}
                  onChange={(e) => setAddType(e.target.value as SpecialDateType)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SPECIAL_DATE_TYPES.map((t) => (
                    <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  value={addLabel}
                  onChange={(e) => setAddLabel(e.target.value)}
                  placeholder="Ex: Confraternização Universal"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {addError && <p className="text-red-500 text-sm">{addError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={addLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg py-2.5 text-sm font-medium">
                  {addLoading ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Importar CSV */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-gray-800">Importar CSV</h2>
              <button onClick={() => { setShowImport(false); setCsvPreview([]); setImportError(""); }} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono space-y-0.5">
                <p className="text-gray-500 font-sans font-semibold text-xs mb-1">Formato esperado (CSV):</p>
                <p className="text-blue-600">data,tipo,descricao</p>
                <p className="text-gray-600">2026-01-01,feriado,Confraternização Universal</p>
                <p className="text-gray-600">2026-07-13,ferias,Férias Escolares</p>
                <p className="text-gray-400 font-sans text-xs mt-1">Tipos: {SPECIAL_DATE_TYPES.join(", ")}</p>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Arquivo CSV</label>
                <input
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setCsvText(ev.target?.result as string ?? "");
                      setCsvPreview([]);
                    };
                    reader.readAsText(file, "UTF-8");
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Ou cole o conteúdo CSV aqui</label>
                <textarea
                  rows={6}
                  value={csvText}
                  onChange={(e) => { setCsvText(e.target.value); setCsvPreview([]); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder={"data,tipo,descricao\n2026-01-01,feriado,Confraternização Universal"}
                />
              </div>

              {csvPreview.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-700 text-sm font-semibold mb-1">✅ {csvPreview.length} evento(s) válidos para importar</p>
                  <div className="max-h-20 overflow-y-auto space-y-0.5">
                    {csvPreview.slice(0, 5).map((e, i) => (
                      <p key={i} className="text-green-600 text-xs">{e.date} · {e.label}</p>
                    ))}
                    {csvPreview.length > 5 && <p className="text-green-500 text-xs">...e mais {csvPreview.length - 5}</p>}
                  </div>
                </div>
              )}

              {importError && <p className="text-red-500 text-sm">{importError}</p>}

              <div className="flex gap-3">
                <button
                  onClick={handlePreviewCsv}
                  className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50"
                >
                  Verificar
                </button>
                <button
                  onClick={handleImport}
                  disabled={importLoading || csvPreview.length === 0}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg py-2.5 text-sm font-medium"
                >
                  {importLoading ? "Importando..." : `Importar${csvPreview.length > 0 ? ` (${csvPreview.length})` : ""}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
