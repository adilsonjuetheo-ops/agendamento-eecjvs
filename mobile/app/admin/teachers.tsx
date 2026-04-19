import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { TouchableOpacity } from "react-native";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { adminApi, Teacher } from "../../services/api";

export default function AdminTeachersScreen() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const { data } = await adminApi.getTeachers();
      setTeachers(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  return (
    <View className="flex-1 bg-gray-900">
      <View className="px-5 pt-14 pb-4 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Text className="text-gray-400">←</Text>
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">
          Professores ({teachers.length})
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#c9a227" />
        </View>
      ) : (
        <FlatList
          data={teachers}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View className="bg-gray-800 mx-4 mb-2 rounded-xl p-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-primary items-center justify-center mr-3">
                  <Text className="text-white font-bold text-lg">
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold text-sm">{item.name}</Text>
                  <Text className="text-gray-400 text-xs mt-0.5">{item.email}</Text>
                  <Text className="text-gray-500 text-xs">
                    MASP: {item.matricula} • {item.subjects}
                  </Text>
                </View>
              </View>
              <Text className="text-gray-600 text-xs mt-2">
                Cadastrado em{" "}
                {format(parseISO(item.createdAt), "dd/MM/yyyy", { locale: ptBR })}
              </Text>
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor="#c9a227"
            />
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}
