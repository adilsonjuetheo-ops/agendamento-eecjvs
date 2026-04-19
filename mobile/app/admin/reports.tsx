import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { adminApi } from "../../services/api";

const ROOM_COLORS: Record<string, string> = {
  "Sala de Informática": "#3b82f6",
  "Laboratório de Ciências": "#8b5cf6",
  "Quadra Poliesportiva": "#f59e0b",
  "Biblioteca": "#ec4899",
};

export default function AdminReportsScreen() {
  const [rooms, setRooms] = useState<{ room: string; count: number }[]>([]);
  const [teachers, setTeachers] = useState<{ teacherName: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const [roomsRes, teachersRes] = await Promise.all([
        adminApi.getRoomsReport(),
        adminApi.getTeachersReport(),
      ]);
      setRooms(roomsRes.data);
      setTeachers(teachersRes.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  const maxCount = rooms.reduce((m, r) => Math.max(m, r.count), 1);

  function handleExport() {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    Alert.alert(
      "Exportar CSV",
      "O CSV será aberto no navegador para download.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Abrir",
          onPress: () =>
            Linking.openURL(`${apiUrl}/api/admin/reports/export`),
        },
      ]
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-900">
        <ActivityIndicator color="#c9a227" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-900">
      <View className="px-5 pt-14 pb-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Text className="text-gray-400">←</Text>
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold">Relatórios</Text>
        </View>
        <TouchableOpacity
          className="bg-accent rounded-lg px-4 py-2"
          onPress={handleExport}
        >
          <Text className="text-white text-xs font-semibold">↓ Exportar CSV</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor="#c9a227"
          />
        }
      >
        {/* Uso por sala */}
        <View className="bg-gray-800 rounded-xl p-4 mb-4">
          <Text className="text-white font-semibold mb-4">
            Uso por espaço (mês atual)
          </Text>
          {rooms.length === 0 ? (
            <Text className="text-gray-500 text-sm">Sem dados</Text>
          ) : (
            rooms.map((r) => (
              <View key={r.room} className="mb-3">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-gray-300 text-xs">{r.room}</Text>
                  <Text className="text-gray-400 text-xs">{r.count} reserva{r.count !== 1 ? "s" : ""}</Text>
                </View>
                <View className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${(r.count / maxCount) * 100}%`,
                      backgroundColor: ROOM_COLORS[r.room] || "#6b7280",
                    }}
                  />
                </View>
              </View>
            ))
          )}
        </View>

        {/* Ranking professores */}
        <View className="bg-gray-800 rounded-xl p-4 mb-10">
          <Text className="text-white font-semibold mb-4">
            Ranking de professores
          </Text>
          {teachers.length === 0 ? (
            <Text className="text-gray-500 text-sm">Sem dados</Text>
          ) : (
            teachers.map((t, i) => (
              <View
                key={t.teacherName}
                className="flex-row items-center py-2 border-b border-gray-700 last:border-0"
              >
                <Text className="text-accent font-bold text-lg w-8">
                  {i + 1}
                </Text>
                <Text className="text-white text-sm flex-1">{t.teacherName}</Text>
                <View className="bg-primary rounded-full px-3 py-0.5">
                  <Text className="text-white text-xs">{t.count}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
