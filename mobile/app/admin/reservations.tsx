import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { adminApi, Reservation } from "../../services/api";

const ROOMS = [
  "Todas",
  "Sala de Informática",
  "Laboratório de Ciências",
  "Quadra Poliesportiva",
  "Biblioteca",
];

export default function AdminReservationsScreen() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roomFilter, setRoomFilter] = useState("Todas");
  const [statusFilter, setStatusFilter] = useState("ativo");
  const [actionId, setActionId] = useState<number | null>(null);

  async function load() {
    try {
      const { data } = await adminApi.getReservations({
        room: roomFilter !== "Todas" ? roomFilter : undefined,
        status: statusFilter,
      });
      setReservations(data);
    } catch {
      Alert.alert("Erro", "Falha ao carregar reservas");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [roomFilter, statusFilter])
  );

  async function handleToggleStatus(r: Reservation) {
    const isActive = !r.status;
    Alert.alert(
      isActive ? "Cancelar reserva" : "Restaurar reserva",
      `Deseja ${isActive ? "cancelar" : "restaurar"} esta reserva?`,
      [
        { text: "Não", style: "cancel" },
        {
          text: "Sim",
          onPress: async () => {
            setActionId(r.id);
            try {
              await adminApi.updateReservation(r.id, isActive ? "cancelado" : null);
              load();
            } catch {
              Alert.alert("Erro", "Falha ao atualizar");
            } finally {
              setActionId(null);
            }
          },
        },
      ]
    );
  }

  async function handleDelete(id: number) {
    Alert.alert("Excluir reserva", "Esta ação é irreversível. Confirma?", [
      { text: "Não", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          setActionId(id);
          try {
            await adminApi.deleteReservation(id);
            setReservations((prev) => prev.filter((r) => r.id !== id));
          } catch {
            Alert.alert("Erro", "Falha ao excluir");
          } finally {
            setActionId(null);
          }
        },
      },
    ]);
  }

  return (
    <View className="flex-1 bg-gray-900">
      <View className="px-5 pt-14 pb-4 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Text className="text-gray-400">←</Text>
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Reservas</Text>
      </View>

      {/* Filtros */}
      <View className="px-4 mb-3">
        <View className="flex-row mb-2">
          {["ativo", "cancelado"].map((s) => (
            <TouchableOpacity
              key={s}
              className={`mr-2 px-4 py-2 rounded-full ${
                statusFilter === s ? "bg-accent" : "bg-gray-700"
              }`}
              onPress={() => setStatusFilter(s)}
            >
              <Text className="text-white text-xs capitalize">{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#c9a227" />
        </View>
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View className="bg-gray-800 mx-4 mb-2 rounded-xl p-4">
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="text-white font-semibold text-sm">{item.room}</Text>
                  <Text className="text-gray-400 text-xs mt-0.5">
                    {item.teacherName} • {item.subject}
                  </Text>
                  <Text className="text-gray-500 text-xs mt-0.5">
                    {format(parseISO(item.startTime), "dd/MM/yy HH:mm", { locale: ptBR })} –{" "}
                    {format(parseISO(item.endTime), "HH:mm")}
                  </Text>
                </View>
                <View className="items-end ml-2">
                  {item.status ? (
                    <View className="bg-red-900/50 rounded-full px-2 py-0.5 mb-2">
                      <Text className="text-red-400 text-xs">Cancelado</Text>
                    </View>
                  ) : (
                    <View className="bg-green-900/50 rounded-full px-2 py-0.5 mb-2">
                      <Text className="text-green-400 text-xs">Ativo</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Ações */}
              <View className="flex-row mt-3 pt-3 border-t border-gray-700">
                <TouchableOpacity
                  className="flex-1 items-center py-1"
                  onPress={() => handleToggleStatus(item)}
                  disabled={actionId === item.id}
                >
                  <Text className="text-accent text-xs">
                    {item.status ? "Restaurar" : "Cancelar"}
                  </Text>
                </TouchableOpacity>
                <View className="w-px bg-gray-700" />
                <TouchableOpacity
                  className="flex-1 items-center py-1"
                  onPress={() => handleDelete(item.id)}
                  disabled={actionId === item.id}
                >
                  {actionId === item.id ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                  ) : (
                    <Text className="text-red-400 text-xs">Excluir</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View className="items-center py-20">
              <Text className="text-gray-500 text-base">Nenhuma reserva encontrada</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor="#c9a227"
            />
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}
