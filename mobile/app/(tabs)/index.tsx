import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import { format, parseISO, isToday, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { useAuthStore } from "../../store/authStore";
import { useOfflineCache } from "../../hooks/useOfflineCache";
import { useNotificationListener, registerForPushNotificationsAsync } from "../../hooks/useNotifications";

const ROOM_COLORS: Record<string, string> = {
  "Sala de Informática": "#3b82f6",
  "Laboratório de Ciências": "#8b5cf6",
  "Quadra Poliesportiva": "#f59e0b",
  "Biblioteca": "#ec4899",
};

const ROOM_ICONS: Record<string, string> = {
  "Sala de Informática": "💻",
  "Laboratório de Ciências": "🔬",
  "Quadra Poliesportiva": "⚽",
  "Biblioteca": "📚",
};

export default function HomeScreen() {
  const teacher = useAuthStore((s) => s.teacher);
  const { reservations, specialDates, isOffline, loading, refresh } = useOfflineCache();
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [dayReservations, setDayReservations] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useNotificationListener();

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [])
  );

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  const today = format(new Date(), "yyyy-MM-dd");

  const todayReservations = reservations.filter((r) =>
    r.startTime.startsWith(today)
  );

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const myWeekReservations = reservations.filter((r) => {
    const d = parseISO(r.startTime);
    return (
      r.teacherId === teacher?.id &&
      d >= weekStart &&
      d <= weekEnd
    );
  });

  const myReservations = reservations
    .filter((r) => r.teacherId === teacher?.id)
    .sort((a, b) => parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime())
    .slice(0, 3);

  // Monta marcações do calendário
  const markedDates: Record<string, any> = {};

  reservations.forEach((r) => {
    const dateKey = r.startTime.split("T")[0];
    if (!markedDates[dateKey]) markedDates[dateKey] = { dots: [] };
    const color = ROOM_COLORS[r.room] || "#6b7280";
    const exists = markedDates[dateKey].dots.find((d: any) => d.color === color);
    if (!exists) markedDates[dateKey].dots.push({ color, key: r.room });
  });

  specialDates.forEach((sd) => {
    const blocking = ["feriado", "ferias"].includes(sd.type);
    markedDates[sd.date] = {
      ...markedDates[sd.date],
      disabled: blocking,
      disableTouchEvent: false,
      customStyles: blocking
        ? { container: { backgroundColor: "#fee2e2" }, text: { color: "#dc2626" } }
        : { container: { backgroundColor: "#fef9c3" }, text: { color: "#92400e" } },
    };
  });

  if (selectedDate) {
    markedDates[selectedDate] = {
      ...markedDates[selectedDate],
      selected: true,
      selectedColor: "#2563eb",
    };
  }

  function handleDayPress(day: DateData) {
    const dateStr = day.dateString;
    setSelectedDate(dateStr);
    const dayRes = reservations.filter((r) => r.startTime.startsWith(dateStr));
    setDayReservations(dayRes);
    setModalVisible(true);
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const firstName = teacher?.name?.split(" ")[0] ?? "";

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-primary px-5 pt-14 pb-6">
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-green-200 text-sm">Olá,</Text>
            <Text className="text-white text-2xl font-bold">{firstName}</Text>
          </View>
          <View className="items-end">
            {isOffline && (
              <View className="bg-yellow-500 rounded-full px-3 py-1 mb-1">
                <Text className="text-white text-xs font-semibold">Offline</Text>
              </View>
            )}
            <Text className="text-green-200 text-xs">
              {format(new Date(), "EEEE, d 'de' MMM", { locale: ptBR })}
            </Text>
          </View>
        </View>

        {/* Cards de resumo */}
        <View className="flex-row gap-3">
          <View className="flex-1 bg-white/15 rounded-xl p-3">
            <Text className="text-green-100 text-xs mb-1">Hoje</Text>
            <Text className="text-white text-2xl font-bold">{todayReservations.length}</Text>
            <Text className="text-green-200 text-xs">reserva{todayReservations.length !== 1 ? "s" : ""}</Text>
          </View>
          <View className="flex-1 bg-white/15 rounded-xl p-3">
            <Text className="text-green-100 text-xs mb-1">Esta semana</Text>
            <Text className="text-white text-2xl font-bold">{myWeekReservations.length}</Text>
            <Text className="text-green-200 text-xs">sua{myWeekReservations.length !== 1 ? "s" : ""}</Text>
          </View>
          <View className="flex-1 bg-white/15 rounded-xl p-3">
            <Text className="text-green-100 text-xs mb-1">Total</Text>
            <Text className="text-white text-2xl font-bold">{reservations.filter(r => r.teacherId === teacher?.id).length}</Text>
            <Text className="text-green-200 text-xs">seus</Text>
          </View>
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Reservas de hoje */}
        {todayReservations.length > 0 && (
          <View className="mx-4 mt-4">
            <Text className="text-gray-700 font-semibold text-sm mb-2">Hoje no espaço escolar</Text>
            {todayReservations.map((r) => (
              <View
                key={r.id}
                className="bg-white rounded-xl p-3 mb-2 flex-row items-center shadow-sm"
                style={{ borderLeftWidth: 4, borderLeftColor: ROOM_COLORS[r.room] || "#6b7280" }}
              >
                <Text className="text-2xl mr-3">{ROOM_ICONS[r.room] || "📌"}</Text>
                <View className="flex-1">
                  <Text className="text-gray-800 font-semibold text-sm">{r.room}</Text>
                  <Text className="text-gray-500 text-xs">
                    {format(parseISO(r.startTime), "HH:mm")} – {format(parseISO(r.endTime), "HH:mm")} • {r.teacherName}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Atalhos rápidos */}
        <View className="mx-4 mt-4">
          <Text className="text-gray-700 font-semibold text-sm mb-2">Agendar espaço</Text>
          <View className="flex-row flex-wrap gap-2">
            {Object.entries(ROOM_ICONS).map(([room, icon]) => (
              <TouchableOpacity
                key={room}
                className="bg-white rounded-xl px-3 py-3 items-center shadow-sm"
                style={{ width: "48%", borderTopWidth: 3, borderTopColor: ROOM_COLORS[room] }}
                onPress={() => router.push("/(tabs)/new-reservation")}
              >
                <Text className="text-2xl mb-1">{icon}</Text>
                <Text className="text-gray-700 text-xs text-center font-medium">{room}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Calendário */}
        <View className="mx-4 mt-4 bg-white rounded-2xl shadow-sm overflow-hidden">
          <Text className="text-gray-700 font-semibold text-sm px-4 pt-4 pb-2">Calendário de reservas</Text>
          <Calendar
            onDayPress={handleDayPress}
            markedDates={markedDates}
            markingType="multi-dot"
            theme={{
              selectedDayBackgroundColor: "#2563eb",
              todayTextColor: "#2563eb",
              arrowColor: "#2563eb",
              monthTextColor: "#2563eb",
              textDayFontSize: 14,
              calendarBackground: "#ffffff",
            }}
          />
          {/* Legenda */}
          <View className="px-4 pb-4 pt-2 border-t border-gray-100">
            <View className="flex-row flex-wrap">
              {Object.entries(ROOM_COLORS).map(([room, color]) => (
                <View key={room} className="flex-row items-center mr-3 mb-1">
                  <View className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: color }} />
                  <Text className="text-gray-500 text-xs">{room}</Text>
                </View>
              ))}
            </View>
            <View className="flex-row items-center mt-1">
              <View className="w-2 h-2 rounded mr-1 bg-red-200" />
              <Text className="text-gray-400 text-xs mr-3">Bloqueado</Text>
              <View className="w-2 h-2 rounded mr-1 bg-yellow-200" />
              <Text className="text-gray-400 text-xs">Ponto facultativo</Text>
            </View>
          </View>
        </View>

        {/* Minhas reservas recentes */}
        <View className="mx-4 mt-4 mb-6">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-gray-700 font-semibold text-sm">Minhas reservas recentes</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/my-reservations")}>
              <Text className="text-primary text-xs font-semibold">Ver todas</Text>
            </TouchableOpacity>
          </View>
          {myReservations.length === 0 ? (
            <View className="bg-white rounded-xl p-6 items-center shadow-sm">
              <Text className="text-gray-400 text-sm">Nenhuma reserva ainda</Text>
              <TouchableOpacity
                className="mt-3 bg-primary rounded-lg px-5 py-2"
                onPress={() => router.push("/(tabs)/new-reservation")}
              >
                <Text className="text-white text-sm font-semibold">Fazer agendamento</Text>
              </TouchableOpacity>
            </View>
          ) : (
            myReservations.map((r) => (
              <View
                key={r.id}
                className="bg-white rounded-xl p-3 mb-2 shadow-sm"
                style={{ borderLeftWidth: 4, borderLeftColor: ROOM_COLORS[r.room] || "#6b7280" }}
              >
                <View className="flex-row items-center">
                  <Text className="text-xl mr-2">{ROOM_ICONS[r.room] || "📌"}</Text>
                  <View className="flex-1">
                    <Text className="text-gray-800 font-semibold text-sm">{r.room}</Text>
                    <Text className="text-gray-500 text-xs">
                      {format(parseISO(r.startTime), "dd/MM/yyyy")} • {format(parseISO(r.startTime), "HH:mm")} – {format(parseISO(r.endTime), "HH:mm")}
                    </Text>
                    <Text className="text-gray-400 text-xs">{r.subject}</Text>
                  </View>
                  {r.status === "cancelado" && (
                    <View className="bg-red-100 rounded-full px-2 py-0.5">
                      <Text className="text-red-600 text-xs">Cancelado</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal detalhe do dia */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/40"
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 max-h-[70%]">
            <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-4" />
            <Text className="text-gray-800 text-lg font-bold mb-1">
              {selectedDate
                ? format(parseISO(selectedDate), "EEEE, d 'de' MMMM", { locale: ptBR })
                : ""}
            </Text>

            {selectedDate &&
              specialDates
                .filter((sd) => sd.date === selectedDate)
                .map((sd) => (
                  <View
                    key={sd.id}
                    className="flex-row items-center bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-3"
                  >
                    <Text className="text-yellow-700 text-sm">
                      {["feriado", "ferias"].includes(sd.type) ? "🔴" : "🟡"}{" "}
                      {sd.label}
                    </Text>
                  </View>
                ))}

            {dayReservations.length === 0 ? (
              <View className="items-center py-8">
                <Text className="text-gray-500 text-base">Nenhuma reserva neste dia</Text>
                <TouchableOpacity
                  className="mt-4 bg-primary rounded-lg px-6 py-3"
                  onPress={() => {
                    setModalVisible(false);
                    router.push("/(tabs)/new-reservation");
                  }}
                >
                  <Text className="text-white font-semibold">Agendar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={dayReservations}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <View
                    className="bg-gray-50 rounded-xl p-3 mb-2 border-l-4"
                    style={{ borderLeftColor: ROOM_COLORS[item.room] || "#6b7280" }}
                  >
                    <View className="flex-row items-center">
                      <Text className="text-xl mr-2">{ROOM_ICONS[item.room] || "📌"}</Text>
                      <View className="flex-1">
                        <Text className="text-gray-800 font-semibold text-sm">{item.room}</Text>
                        <Text className="text-gray-600 text-xs mt-0.5">
                          {format(parseISO(item.startTime), "HH:mm")} – {format(parseISO(item.endTime), "HH:mm")}
                        </Text>
                        <Text className="text-gray-500 text-xs">{item.teacherName} • {item.subject}</Text>
                      </View>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
