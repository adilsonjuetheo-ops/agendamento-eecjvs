import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useAuthStore } from "../../store/authStore";

export default function CompleteGoogleProfileScreen() {
  const [matricula, setMatricula] = useState("");
  const [subjects, setSubjects] = useState("");
  const [loading, setLoading] = useState(false);

  const completeGoogleRegistration = useAuthStore((s) => s.completeGoogleRegistration);
  const pendingName = useAuthStore((s) => s.pendingGoogleName);
  const pendingEmail = useAuthStore((s) => s.pendingGoogleEmail);

  async function handleComplete() {
    setLoading(true);
    try {
      await completeGoogleRegistration(matricula, subjects);
      router.replace("/");
    } catch (err: any) {
      Alert.alert(
        "Erro",
        err?.response?.data?.error || "Erro ao completar cadastro"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <LinearGradient
        colors={["#0f172a", "#1e293b", "#1e3a6e"]}
        locations={[0, 0.55, 1]}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-center px-6 py-12">
            <View className="bg-white rounded-2xl p-6 shadow-lg">
              <Text className="text-gray-700 text-lg font-semibold mb-2">
                Complete seu cadastro
              </Text>
              <Text className="text-gray-500 text-sm mb-5">
                Olá, {pendingName}! Você pode adicionar dados institucionais agora ou depois no perfil.
              </Text>

              {pendingEmail && (
                <View className="bg-blue-50 rounded-lg px-4 py-3 mb-5">
                  <Text className="text-blue-600 text-sm font-medium">
                    {pendingEmail}
                  </Text>
                </View>
              )}

              <Text className="text-gray-600 text-sm mb-1">MASP (opcional)</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-gray-800"
                placeholder="Ex: 1234567"
                keyboardType="number-pad"
                value={matricula}
                onChangeText={setMatricula}
              />

              <Text className="text-gray-600 text-sm mb-1">Disciplinas (opcional)</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 mb-6 text-gray-800"
                placeholder="Ex: Matemática, Física"
                value={subjects}
                onChangeText={setSubjects}
              />

              <TouchableOpacity
                className="bg-primary rounded-lg py-4 items-center"
                onPress={handleComplete}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold text-base">
                    Finalizar cadastro
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
