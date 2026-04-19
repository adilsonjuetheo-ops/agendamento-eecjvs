import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { format, parseISO, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { reservationsApi, Reservation } from "../../services/api";

const ROOM_COLORS: Record<string, string> = {
  "Sala de Informática": "#3b82f6",
  "Laboratório de Ciências": "#8b5cf6",
  "Quadra Poliesportiva": "#f59e0b",
  "Biblioteca": "#ec4899",
};

export default function MyReservationsScreen() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  async function loadReservations() {
    try {
      const { data } = await reservationsApi.getMy();
      setReservations(data);
    } catch {
      Alert.alert("Erro", "Não foi possível carregar suas reservas");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadReservations();
    }, [])
  );

  async function handleCancel(id: number) {
    Alert.alert(
      "Cancelar reserva",
      "Tem certeza que deseja cancelar esta reserva?",
      [
        { text: "Não", style: "cancel" },
        {
          text: "Sim, cancelar",
          style: "destructive",
          onPress: async () => {
            setCancellingId(id);
            try {
              await reservationsApi.cancel(id);
              setReservations((prev) =>
                prev.map((r) =>
                  r.id === id ? { ...r, status: "cancelado" } : r
                )
              );
            } catch (err: any) {
              Alert.alert(
                "Erro",
                err?.response?.data?.error || "Erro ao cancelar"
              );
            } finally {
              setCancellingId(null);
            }
          },
        },
      ]
    );
  }

  const upcoming = reservations.filter(
    (r) => !r.status && !isPast(parseISO(r.startTime))
  );
  const past = reservations.filter(
    (r) => r.status || isPast(parseISO(r.startTime))
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#1a5c2e" />
      </View>
    );
  }

  function ReservationCard({ item }: { item: Reservation }) {
    const isCancelled = item.status === "cancelado";
    const isPastReservation = isPast(parseISO(item.startTime));
    const canCancel = !isCancelled && !isPastReservation;

    return (
      <View
        className={`bg-white rounded-xl p-4 mb-3 shadow-sm border-l-4 ${
          isCancelled ? "opacity-60" : ""
        }`}
        style={{ borderLeftColor: ROOM_COLORS[item.room] || "#6b7280" }}
      >
        <View className="flex-row justify-between items-start">
          <View className="flex-1">
            <Text className="text-gray-800 font-semibold text-sm">{item.room}</Text>
            <Text className="text-gray-600 text-xs mt-0.5">{item.subject}</Text>
            <Text className="text-gray-500 text-xs mt-1">
              {format(parseISO(item.startTime), "dd/MM/yyyy", { locale: ptBR })}
              {" · "}
              {format(parseISO(item.startTime), "HH:mm")} –{" "}
              {format(parseISO(item.endTime), "HH:mm")}
            </Text>
          </View>

          <View className="items-end ml-3">
            {isCancelled ? (
              <View className="bg-red-100 rounded-full px-2 py-0.5">
                <Text className="text-red-600 text-xs font-semibold">Cancelado</Text>
              </View>
            ) : isPastReservation ? (
              <View className="bg-gray-100 rounded-full px-2 py-0.5">
                <Text className="text-gray-500 text-xs">Concluído</Text>
              </View>
            ) : (
              <View className="bg-green-100 rounded-full px-2 py-0.5">
                <Text className="text-green-700 text-xs font-semibold">Ativo</Text>
              </View>
            )}

            {canCancel && (
              <TouchableOpacity
                className="mt-2"
                onPress={() => handleCancel(item.id)}
                disabled={cancellingId === item.id}
              >
                {cancellingId === item.id ? (
                  <ActivityIndicator size="small" color="#dc2626" />
                ) : (
                  <Text className="text-red-500 text-xs">Cancelar</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-primary px-5 pt-14 pb-5">
        <Text className="text-white text-xl font-bold">Minhas Reservas</Text>
        <Text className="text-green-200 text-sm mt-0.5">
          {upcoming.length} ativa{upcoming.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <FlatList
        data={[...upcoming, ...past]}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => (
          <>
            {index === 0 && upcoming.length > 0 && (
              <Text className="text-gray-500 text-xs font-semibold uppercase px-4 pt-4 pb-2">
                Próximas
              </Text>
            )}
            {index === upcoming.length && past.length > 0 && (
              <Text className="text-gray-500 text-xs font-semibold uppercase px-4 pt-4 pb-2">
                Histórico
              </Text>
            )}
            <View className="px-4">
              <ReservationCard item={item} />
            </View>
          </>
        )}
        ListEmptyComponent={
          <View className="items-center py-20">
            <Text className="text-4xl mb-3">📅</Text>
            <Text className="text-gray-600 text-base font-medium">
              Nenhuma reserva
            </Text>
            <Text className="text-gray-500 text-sm mt-1">
              Suas reservas aparecerão aqui
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadReservations();
            }}
          />
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}
