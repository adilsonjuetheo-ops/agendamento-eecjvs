import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { adminApi, Reservation } from "../../services/api";
import { useAdminAuthStore } from "../../store/authStore";

interface Stats {
  today: number;
  week: number;
  month: number;
  total: number;
}

export default function AdminDashboardScreen() {
  const { email, logout } = useAdminAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [todayReservations, setTodayReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    try {
      const today = new Date().toISOString().split("T")[0];
      const [statsRes, reservationsRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getReservations({ startDate: today, endDate: today }),
      ]);
      setStats(statsRes.data);
      setTodayReservations(reservationsRes.data);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        await logout();
        router.replace("/admin/login");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleLogout() {
    await logout();
    router.replace("/admin/login");
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-900">
        <ActivityIndicator size="large" color="#c9a227" />
      </View>
    );
  }

  const StatCard = ({
    label,
    value,
    color,
  }: {
    label: string;
    value: number;
    color: string;
  }) => (
    <View className="bg-gray-800 rounded-xl p-4 flex-1 mx-1">
      <Text className="text-gray-400 text-xs">{label}</Text>
      <Text className="text-white text-3xl font-bold mt-1">{value}</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-900">
      <View className="px-5 pt-14 pb-5 flex-row justify-between items-end">
        <View>
          <Text className="text-gray-400 text-sm">Painel Admin</Text>
          <Text className="text-white text-xl font-bold">EECJVS</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text className="text-red-400 text-sm">Sair</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor="#c9a227"
          />
        }
      >
        {/* Stats */}
        <View className="px-4 mb-4">
          <View className="flex-row mb-2">
            <StatCard label="Hoje" value={stats?.today || 0} color="#3b82f6" />
            <StatCard label="Semana" value={stats?.week || 0} color="#8b5cf6" />
          </View>
          <View className="flex-row">
            <StatCard label="Mês" value={stats?.month || 0} color="#f59e0b" />
            <StatCard label="Total" value={stats?.total || 0} color="#10b981" />
          </View>
        </View>

        {/* Menu */}
        <View className="px-4 mb-4">
          <Text className="text-gray-400 text-xs font-semibold uppercase mb-3">
            Gestão
          </Text>
          {[
            { label: "Todas as Reservas", icon: "📋", route: "/admin/reservations" },
            { label: "Professores", icon: "👩‍🏫", route: "/admin/teachers" },
            { label: "Relatórios", icon: "📊", route: "/admin/reports" },
          ].map(({ label, icon, route }) => (
            <TouchableOpacity
              key={route}
              className="bg-gray-800 rounded-xl p-4 mb-2 flex-row items-center"
              onPress={() => router.push(route as any)}
            >
              <Text className="text-2xl mr-3">{icon}</Text>
              <Text className="text-white font-medium flex-1">{label}</Text>
              <Text className="text-gray-500">›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reservas de hoje */}
        <View className="px-4 mb-10">
          <Text className="text-gray-400 text-xs font-semibold uppercase mb-3">
            Reservas de hoje
          </Text>
          {todayReservations.length === 0 ? (
            <View className="bg-gray-800 rounded-xl p-6 items-center">
              <Text className="text-gray-500 text-sm">Nenhuma reserva hoje</Text>
            </View>
          ) : (
            todayReservations.map((r) => (
              <View key={r.id} className="bg-gray-800 rounded-xl p-4 mb-2">
                <View className="flex-row justify-between">
                  <Text className="text-white font-medium text-sm">{r.room}</Text>
                  <Text className="text-gray-400 text-xs">
                    {format(parseISO(r.startTime), "HH:mm")} –{" "}
                    {format(parseISO(r.endTime), "HH:mm")}
                  </Text>
                </View>
                <Text className="text-gray-400 text-xs mt-0.5">
                  {r.teacherName} • {r.subject}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
