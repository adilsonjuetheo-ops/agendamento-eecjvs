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
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { reservationsApi } from "../../services/api";

const ROOMS = [
  "Sala de Informática",
  "Laboratório de Ciências",
  "Quadra Poliesportiva",
  "Biblioteca",
] as const;

const ROOM_ICONS: Record<string, string> = {
  "Sala de Informática": "💻",
  "Laboratório de Ciências": "🔬",
  "Quadra Poliesportiva": "⚽",
  "Biblioteca": "📚",
};

const SLOTS: Record<string, { label: string; start: string; end: string }[]> = {
  MANHÃ: [
    { label: "7:30 – 8:20", start: "07:30", end: "08:20" },
    { label: "8:20 – 9:10", start: "08:20", end: "09:10" },
    { label: "9:10 – 10:00", start: "09:10", end: "10:00" },
    { label: "10:20 – 11:10", start: "10:20", end: "11:10" },
    { label: "11:10 – 12:00", start: "11:10", end: "12:00" },
  ],
  TARDE: [
    { label: "13:00 – 13:50", start: "13:00", end: "13:50" },
    { label: "13:50 – 14:40", start: "13:50", end: "14:40" },
    { label: "14:40 – 15:30", start: "14:40", end: "15:30" },
    { label: "15:50 – 16:40", start: "15:50", end: "16:40" },
    { label: "16:40 – 17:30", start: "16:40", end: "17:30" },
  ],
  NOITE: [
    { label: "19:00 – 19:50", start: "19:00", end: "19:50" },
    { label: "19:50 – 20:40", start: "19:50", end: "20:40" },
    { label: "20:40 – 21:30", start: "20:40", end: "21:30" },
    { label: "21:50 – 22:40", start: "21:50", end: "22:40" },
  ],
};

function buildDateTime(date: Date, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

export default function NewReservationScreen() {
  const [room, setRoom] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [availability, setAvailability] = useState<{ available: boolean; reason?: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (room && selectedSlot) checkAvailability();
    else setAvailability(null);
  }, [room, selectedSlot, date]);

  async function checkAvailability() {
    if (!room || !selectedSlot) return;
    setChecking(true);
    try {
      const { data } = await reservationsApi.checkAvailability({
        room,
        startTime: buildDateTime(date, selectedSlot.start).toISOString(),
        endTime: buildDateTime(date, selectedSlot.end).toISOString(),
      });
      setAvailability(data);
    } catch {
      setAvailability(null);
    } finally {
      setChecking(false);
    }
  }

  async function handleSubmit() {
    if (!room) { Alert.alert("Erro", "Selecione um espaço"); return; }
    if (!selectedSlot) { Alert.alert("Erro", "Selecione um horário"); return; }
    if (!subject.trim()) { Alert.alert("Erro", "Informe a disciplina / turma"); return; }

    setLoading(true);
    try {
      const { data: newRes } = await reservationsApi.create({
        room,
        subject: subject.trim(),
        startTime: buildDateTime(date, selectedSlot.start).toISOString(),
        endTime: buildDateTime(date, selectedSlot.end).toISOString(),
      });

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
        <TouchableOpacity onPress={() => router.back()} className="mb-2">
          <Text className="text-blue-200 text-sm">← Voltar</Text>
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Nova Reserva</Text>
        <Text className="text-blue-200 text-sm mt-0.5">
          Preencha os dados abaixo para reservar a sala.
        </Text>
      </View>

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>

        {/* Espaço */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-gray-700 font-semibold mb-3">Espaço</Text>
          <View className="flex-row flex-wrap gap-2">
            {ROOMS.map((r) => (
              <TouchableOpacity
                key={r}
                className={`flex-row items-center px-3 py-2 rounded-xl border ${
                  room === r ? "border-primary bg-blue-50" : "border-gray-200 bg-gray-50"
                }`}
                style={{ width: "48%" }}
                onPress={() => setRoom(r)}
              >
                <Text className="text-lg mr-2">{ROOM_ICONS[r]}</Text>
                <Text
                  className={`text-xs flex-1 ${room === r ? "text-primary font-semibold" : "text-gray-600"}`}
                  numberOfLines={2}
                >
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Disciplina / Turma */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-gray-700 font-semibold mb-2">Disciplina / Turma</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
            placeholder="Ex: Matemática — 9º Ano B"
            value={subject}
            onChangeText={setSubject}
          />
        </View>

        {/* Data */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-gray-700 font-semibold mb-2">Data</Text>
          <TouchableOpacity
            className="border border-gray-200 rounded-lg px-4 py-3 items-center"
            onPress={() => setShowDatePicker(true)}
          >
            <Text className="text-gray-800 text-base">
              {format(date, "d 'de' MMM. 'de' yyyy", { locale: ptBR })}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              minimumDate={new Date()}
              onChange={(_, d) => {
                setShowDatePicker(false);
                if (d) { setDate(d); setSelectedSlot(null); }
              }}
            />
          )}
        </View>

        {/* Horários */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-gray-700 font-semibold mb-3">Horário</Text>
          {Object.entries(SLOTS).map(([period, slots]) => (
            <View key={period} className="mb-3">
              <Text className="text-gray-400 text-xs font-semibold tracking-widest mb-2">{period}</Text>
              <View className="flex-row flex-wrap gap-2">
                {slots.map((slot) => {
                  const isSelected = selectedSlot?.start === slot.start && selectedSlot?.end === slot.end;
                  return (
                    <TouchableOpacity
                      key={slot.label}
                      className={`px-3 py-2 rounded-xl border ${
                        isSelected ? "bg-primary border-primary" : "border-gray-200 bg-gray-50"
                      }`}
                      style={{ width: "47%" }}
                      onPress={() => setSelectedSlot({ start: slot.start, end: slot.end })}
                    >
                      <Text className={`text-sm text-center ${isSelected ? "text-white font-semibold" : "text-gray-700"}`}>
                        {slot.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        {/* Disponibilidade */}
        {room && selectedSlot && (
          <View className={`rounded-xl p-3 mb-4 ${
            checking ? "bg-gray-100" : availability?.available
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}>
            {checking ? (
              <ActivityIndicator size="small" color="#6b7280" />
            ) : (
              <Text className={availability?.available ? "text-green-700" : "text-red-700"}>
                {availability?.available
                  ? "✅ Disponível para o horário selecionado"
                  : `❌ ${availability?.reason || "Horário indisponível"}`}
              </Text>
            )}
          </View>
        )}

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
            <Text className="text-white font-semibold text-base">Confirmar Reserva</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
