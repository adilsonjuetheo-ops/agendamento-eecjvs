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
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { router } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useOfflineCache } from "../../hooks/useOfflineCache";
import { useNotificationListener, registerForPushNotificationsAsync } from "../../hooks/useNotifications";

const ROOM_COLORS: Record<string, string> = {
  "Sala de Informática": "#3b82f6",
  "Laboratório de Ciências": "#8b5cf6",
  "Quadra Poliesportiva": "#f59e0b",
  "Biblioteca": "#ec4899",
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

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  // Monta marcações do calendário
  const markedDates: Record<string, any> = {};

  // Reservas
  reservations.forEach((r) => {
    const dateKey = r.startTime.split("T")[0];
    if (!markedDates[dateKey]) {
      markedDates[dateKey] = { dots: [] };
    }
    const color = ROOM_COLORS[r.room] || "#6b7280";
    const exists = markedDates[dateKey].dots.find((d: any) => d.color === color);
    if (!exists) {
      markedDates[dateKey].dots.push({ color, key: r.room });
    }
  });

  // Datas especiais
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

  // Dia selecionado
  if (selectedDate) {
    markedDates[selectedDate] = {
      ...markedDates[selectedDate],
      selected: true,
      selectedColor: "#1a5c2e",
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
        <ActivityIndicator size="large" color="#1a5c2e" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-primary px-5 pt-14 pb-5">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-green-200 text-sm">Olá,</Text>
            <Text className="text-white text-xl font-bold">{teacher?.name}</Text>
          </View>
          {isOffline && (
            <View className="bg-yellow-500 rounded-full px-3 py-1">
              <Text className="text-white text-xs font-semibold">Offline</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Calendário */}
        <Calendar
          onDayPress={handleDayPress}
          markedDates={markedDates}
          markingType="multi-dot"
          theme={{
            selectedDayBackgroundColor: "#1a5c2e",
            todayTextColor: "#1a5c2e",
            arrowColor: "#1a5c2e",
            monthTextColor: "#1a5c2e",
            textDayFontSize: 14,
          }}
        />

        {/* Legenda */}
        <View className="mx-4 mt-3 bg-white rounded-xl p-4 shadow-sm">
          <Text className="text-gray-600 text-xs font-semibold mb-2">LEGENDA</Text>
          <View className="flex-row flex-wrap gap-2">
            {Object.entries(ROOM_COLORS).map(([room, color]) => (
              <View key={room} className="flex-row items-center mr-3 mb-1">
                <View
                  className="w-3 h-3 rounded-full mr-1"
                  style={{ backgroundColor: color }}
                />
                <Text className="text-gray-600 text-xs">{room}</Text>
              </View>
            ))}
          </View>
          <View className="flex-row items-center mt-2">
            <View className="w-3 h-3 rounded bg-red-100 mr-1" />
            <Text className="text-gray-500 text-xs mr-3">Bloqueado</Text>
            <View className="w-3 h-3 rounded bg-yellow-100 mr-1" />
            <Text className="text-gray-500 text-xs">Ponto facultativo</Text>
          </View>
        </View>

        {/* Botão agendar */}
        <TouchableOpacity
          className="mx-4 mt-4 mb-6 bg-primary rounded-xl py-4 items-center"
          onPress={() => router.push("/(tabs)/new-reservation")}
        >
          <Text className="text-white font-semibold text-base">
            + Novo agendamento
          </Text>
        </TouchableOpacity>
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

            {/* Indicador data especial */}
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
                <Text className="text-gray-500 text-base">
                  Nenhuma reserva neste dia
                </Text>
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
                  <View className="bg-gray-50 rounded-xl p-3 mb-2 border-l-4"
                    style={{ borderLeftColor: ROOM_COLORS[item.room] || "#6b7280" }}>
                    <Text className="text-gray-800 font-semibold text-sm">
                      {item.room}
                    </Text>
                    <Text className="text-gray-600 text-xs mt-0.5">
                      {format(parseISO(item.startTime), "HH:mm")} –{" "}
                      {format(parseISO(item.endTime), "HH:mm")}
                    </Text>
                    <Text className="text-gray-500 text-xs">
                      {item.teacherName} • {item.subject}
                    </Text>
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
