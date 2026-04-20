import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { parseISO, format, getMonth, getYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { specialDatesApi, SpecialDate, TYPE_CONFIG, SpecialDateType } from "../services/api";

const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

export default function SchoolCalendarScreen() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [allDates, setAllDates] = useState<SpecialDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await specialDatesApi.getAll();
      setAllDates(data);
    } catch {
      // mantém cache anterior
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const yearDates = allDates
    .filter((d) => d.date.startsWith(String(year)))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Agrupa por mês
  const byMonth: Record<number, SpecialDate[]> = {};
  yearDates.forEach((d) => {
    const m = getMonth(parseISO(d.date));
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(d);
  });

  const availableYears = [
    ...new Set(allDates.map((d) => getYear(parseISO(d.date)))),
  ].sort();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-primary px-5 pt-14 pb-5">
        <TouchableOpacity onPress={() => router.back()} className="mb-2">
          <Text className="text-blue-200 text-sm">← Voltar</Text>
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Calendário Escolar</Text>
        <Text className="text-blue-200 text-sm mt-0.5">
          E.E. Cel. José Venâncio de Souza
        </Text>
      </View>

      {/* Seletor de ano */}
      <View className="bg-white border-b border-gray-100 px-4 py-3 flex-row items-center">
        <Text className="text-gray-500 text-sm mr-3">Ano:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {(availableYears.length > 0 ? availableYears : [currentYear]).map((y) => (
              <TouchableOpacity
                key={y}
                onPress={() => setYear(y)}
                className={`px-4 py-1.5 rounded-full border ${
                  year === y
                    ? "bg-primary border-primary"
                    : "border-gray-300 bg-white"
                }`}
              >
                <Text className={`text-sm font-semibold ${year === y ? "text-white" : "text-gray-600"}`}>
                  {y}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {yearDates.length === 0 ? (
          <View className="items-center py-24">
            <Text className="text-4xl mb-3">📅</Text>
            <Text className="text-gray-500 text-base">Nenhum evento cadastrado para {year}</Text>
          </View>
        ) : (
          MONTHS.map((monthName, idx) => {
            const events = byMonth[idx];
            if (!events || events.length === 0) return null;
            return (
              <View key={idx} className="mx-4 mt-5">
                <Text className="text-gray-800 font-bold text-base mb-2 uppercase tracking-wide">
                  {monthName}
                </Text>
                <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {events.map((evt, i) => {
                    const cfg = TYPE_CONFIG[evt.type as SpecialDateType] ?? {
                      label: evt.type,
                      color: "#6b7280",
                      icon: "📌",
                      blocking: false,
                    };
                    const day = format(parseISO(evt.date), "dd", { locale: ptBR });
                    const weekday = format(parseISO(evt.date), "EEE", { locale: ptBR });
                    return (
                      <View
                        key={evt.id}
                        className={`flex-row items-center px-4 py-3 ${
                          i < events.length - 1 ? "border-b border-gray-50" : ""
                        }`}
                      >
                        {/* Data */}
                        <View
                          className="w-12 h-12 rounded-xl items-center justify-center mr-3"
                          style={{ backgroundColor: cfg.color + "20" }}
                        >
                          <Text className="text-xs font-bold" style={{ color: cfg.color }}>
                            {day}
                          </Text>
                          <Text className="text-xs capitalize" style={{ color: cfg.color }}>
                            {weekday}
                          </Text>
                        </View>

                        {/* Evento */}
                        <View className="flex-1">
                          <Text className="text-gray-800 font-semibold text-sm">{evt.label}</Text>
                          <View className="flex-row items-center mt-0.5">
                            <View
                              className="rounded-full px-2 py-0.5"
                              style={{ backgroundColor: cfg.color + "20" }}
                            >
                              <Text className="text-xs font-medium" style={{ color: cfg.color }}>
                                {cfg.icon} {cfg.label}
                              </Text>
                            </View>
                            {cfg.blocking && (
                              <Text className="text-xs text-red-400 ml-2">· sem reservas</Text>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })
        )}

        {/* Legenda */}
        {yearDates.length > 0 && (
          <View className="mx-4 mt-6 bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-500 text-xs font-semibold uppercase mb-3">Legenda</Text>
            <View className="flex-row flex-wrap gap-y-2">
              {(Object.entries(TYPE_CONFIG) as [SpecialDateType, typeof TYPE_CONFIG[SpecialDateType]][]).map(([, cfg]) => (
                <View key={cfg.label} className="flex-row items-center w-1/2 mb-1">
                  <View className="w-3 h-3 rounded-full mr-1.5" style={{ backgroundColor: cfg.color }} />
                  <Text className="text-gray-600 text-xs flex-1" numberOfLines={1}>{cfg.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
