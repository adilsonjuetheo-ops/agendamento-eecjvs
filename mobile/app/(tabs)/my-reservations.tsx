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
import { format, parseISO, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { reservationsApi, Reservation } from "../../services/api";
import { useAuthStore } from "../../store/authStore";

const ROOM_COLORS: Record<string, string> = {
  "Sala de Informática": "#3b82f6",
  "Laboratório de Ciências": "#8b5cf6",
  "Quadra Poliesportiva": "#f59e0b",
  "Biblioteca": "#ec4899",
};

export default function ReservationsScreen() {
  const teacher = useAuthStore((s) => s.teacher);
  const isAuthorized = teacher?.userRole === "autorizado";
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  async function loadReservations() {
    try {
      const { data } = await reservationsApi.getAll();
      setReservations(data);
    } catch {
      Alert.alert("Erro", "Não foi possível carregar as reservas");
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
              const isRoleDenied = err?.response?.status === 403;
              Alert.alert(
                isRoleDenied ? "Acesso restrito" : "Erro",
                isRoleDenied
                  ? "Esta funcionalidade é exclusiva para usuários da instituição."
                  : err?.response?.data?.error || "Erro ao cancelar"
              );
            } finally {
              setCancellingId(null);
            }
          },
        },
      ]
    );
  }

  // Upcoming = não cancelado e não no passado (todos os professores)
  const upcoming = reservations
    .filter((r) => !r.status && !isPast(parseISO(r.endTime)))
    .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());

  // Histórico = somente as do professor logado que já passaram ou foram canceladas
  const history = reservations
    .filter(
      (r) =>
        r.teacherId === teacher?.id &&
        (r.status === "cancelado" || isPast(parseISO(r.endTime)))
    )
    .sort((a, b) => parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime());

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  function ReservationCard({ item }: { item: Reservation }) {
    const isCancelled = item.status === "cancelado";
    const isPastReservation = isPast(parseISO(item.endTime));
    const isOwn = item.teacherId === teacher?.id;
    const canCancel = isAuthorized && isOwn && !isCancelled && !isPastReservation;

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
            <Text className="text-gray-400 text-xs mt-0.5">
              {item.teacherName}
              {isOwn && (
                <Text className="text-blue-400"> (você)</Text>
              )}
            </Text>
          </View>

          <View className="items-end ml-3">
            {isCancelled ? (
              <View className="bg-red-100 rounded-full px-2 py-0.5">
                <Text className="text-red-600 text-xs font-semibold">Cancelado</Text>
              </View>
            ) : isPastReservation ? (
              <View className="bg-gray-100 rounded-full px-2 py-0.5">
                <Text className="text-gray-500 text-xs font-semibold">Concluído</Text>
              </View>
            ) : isToday(parseISO(item.startTime)) ? (
              <View className="bg-blue-100 rounded-full px-2 py-0.5">
                <Text className="text-blue-700 text-xs font-semibold">Hoje</Text>
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

  const listData: Array<Reservation | { sectionHeader: string }> = [
    ...(upcoming.length > 0 ? [{ sectionHeader: "Hoje e Próximas" }] : []),
    ...upcoming,
    ...(history.length > 0 ? [{ sectionHeader: "Histórico (suas reservas)" }] : []),
    ...history,
  ];

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-primary px-5 pt-14 pb-5">
        <Text className="text-white text-xl font-bold">Reservas</Text>
        <Text className="text-blue-200 text-sm mt-0.5">
          {upcoming.length} reserva{upcoming.length !== 1 ? "s" : ""} ativa{upcoming.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item, index) =>
          "sectionHeader" in item ? `header-${index}` : String(item.id)
        }
        renderItem={({ item }) => {
          if ("sectionHeader" in item) {
            return (
              <Text className="text-gray-500 text-xs font-semibold uppercase px-4 pt-4 pb-2">
                {item.sectionHeader}
              </Text>
            );
          }
          return (
            <View className="px-4">
              <ReservationCard item={item} />
            </View>
          );
        }}
        ListEmptyComponent={
          <View className="items-center py-20">
            <Text className="text-4xl mb-3">📅</Text>
            <Text className="text-gray-600 text-base font-medium">
              Nenhuma reserva
            </Text>
            <Text className="text-gray-500 text-sm mt-1">
              As reservas aparecerão aqui
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
