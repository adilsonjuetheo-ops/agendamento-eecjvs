import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { scheduleReservationReminder } from "../../hooks/useNotifications";
import { format, addHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { reservationsApi } from "../../services/api";
import { useAuthStore } from "../../store/authStore";

const ROOMS = [
  "Sala de Informática",
  "Laboratório de Ciências",
  "Quadra Poliesportiva",
  "Biblioteca",
] as const;

export default function NewReservationScreen() {
  const teacher = useAuthStore((s) => s.teacher);
  const [room, setRoom] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [startTime, setStartTime] = useState(() => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    return addHours(now, 1);
  });
  const [endTime, setEndTime] = useState(() => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    return addHours(now, 2);
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [availability, setAvailability] = useState<{
    available: boolean;
    reason?: string;
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (room) checkAvailability();
  }, [room, startTime, endTime]);

  async function checkAvailability() {
    if (!room) return;
    setChecking(true);
    try {
      const { data } = await reservationsApi.checkAvailability({
        room,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });
      setAvailability(data);
    } catch {
      setAvailability(null);
    } finally {
      setChecking(false);
    }
  }

  async function handleSubmit() {
    if (!room) {
      Alert.alert("Erro", "Selecione um espaço");
      return;
    }

    if (!subject.trim()) {
      Alert.alert("Erro", "Informe a disciplina/motivo");
      return;
    }

    if (startTime >= endTime) {
      Alert.alert("Erro", "O horário de início deve ser antes do fim");
      return;
    }

    setLoading(true);
    try {
      const { data: newRes } = await reservationsApi.create({
        room,
        subject: subject.trim(),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      // Agenda lembrete 1h antes
      await scheduleReservationReminder(newRes);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert("Sucesso! 🎉", "Reserva criada com sucesso!", [
        { text: "OK", onPress: () => router.push("/(tabs)/my-reservations") },
      ]);
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Erro", err?.response?.data?.error || "Erro ao criar reserva");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-primary px-5 pt-14 pb-5">
        <Text className="text-white text-xl font-bold">Novo Agendamento</Text>
        <Text className="text-green-200 text-sm mt-0.5">
          Reserve um espaço da escola
        </Text>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Seleção de espaço */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-gray-700 font-semibold mb-3">Espaço</Text>
          {ROOMS.map((r) => (
            <TouchableOpacity
              key={r}
              className={`flex-row items-center p-3 rounded-lg mb-2 border ${
                room === r
                  ? "border-primary bg-green-50"
                  : "border-gray-200 bg-gray-50"
              }`}
              onPress={() => setRoom(r)}
            >
              <View
                className={`w-5 h-5 rounded-full border-2 mr-3 ${
                  room === r ? "border-primary bg-primary" : "border-gray-300"
                }`}
              />
              <Text
                className={
                  room === r ? "text-primary font-semibold" : "text-gray-700"
                }
              >
                {r}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Disponibilidade */}
        {room && (
          <View
            className={`rounded-xl p-3 mb-4 flex-row items-center ${
              checking
                ? "bg-gray-100"
                : availability?.available
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            {checking ? (
              <ActivityIndicator size="small" color="#6b7280" />
            ) : (
              <Text
                className={
                  availability?.available ? "text-green-700" : "text-red-700"
                }
              >
                {availability?.available
                  ? "✅ Disponível para o horário selecionado"
                  : `❌ ${availability?.reason || "Horário indisponível"}`}
              </Text>
            )}
          </View>
        )}

        {/* Horários */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-gray-700 font-semibold mb-3">Horário</Text>

          <TouchableOpacity
            className="border border-gray-300 rounded-lg px-4 py-3 mb-3"
            onPress={() => setShowStartPicker(true)}
          >
            <Text className="text-gray-500 text-xs mb-0.5">Início</Text>
            <Text className="text-gray-800 font-medium">
              {format(startTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="border border-gray-300 rounded-lg px-4 py-3"
            onPress={() => setShowEndPicker(true)}
          >
            <Text className="text-gray-500 text-xs mb-0.5">Fim</Text>
            <Text className="text-gray-800 font-medium">
              {format(endTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </Text>
          </TouchableOpacity>

          {showStartPicker && (
            <DateTimePicker
              value={startTime}
              mode="datetime"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              minimumDate={new Date()}
              onChange={(_, date) => {
                setShowStartPicker(false);
                if (date) {
                  setStartTime(date);
                  if (date >= endTime) setEndTime(addHours(date, 1));
                }
              }}
            />
          )}

          {showEndPicker && (
            <DateTimePicker
              value={endTime}
              mode="datetime"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              minimumDate={startTime}
              onChange={(_, date) => {
                setShowEndPicker(false);
                if (date) setEndTime(date);
              }}
            />
          )}
        </View>

        {/* Disciplina */}
        <View className="bg-white rounded-xl p-4 mb-6 shadow-sm">
          <Text className="text-gray-700 font-semibold mb-2">
            Disciplina / Motivo
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
            placeholder="Ex: Matemática — Geometria Espacial"
            value={subject}
            onChangeText={setSubject}
          />
        </View>

        <TouchableOpacity
          className={`rounded-xl py-4 items-center mb-10 ${
            loading || checking ? "bg-gray-300" : "bg-primary"
          }`}
          onPress={handleSubmit}
          disabled={loading || checking}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-base">
              Confirmar agendamento
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
