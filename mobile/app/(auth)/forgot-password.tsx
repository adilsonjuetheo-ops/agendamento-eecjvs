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
import { router } from "expo-router";
import { authApi } from "../../services/api";

export default function ForgotPasswordScreen() {
  const [matricula, setMatricula] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!matricula || !newPassword || !confirmPassword) {
      Alert.alert("Erro", "Preencha todos os campos");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Erro", "As senhas não coincidem");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Erro", "A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({ matricula, newPassword, confirmPassword });
      Alert.alert("Sucesso", "Senha redefinida com sucesso!", [
        { text: "OK", onPress: () => router.replace("/(auth)/login") },
      ]);
    } catch (err: any) {
      Alert.alert("Erro", err?.response?.data?.error || "MASP não encontrado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-primary"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6 py-12">
          <TouchableOpacity onPress={() => router.back()} className="mb-4">
            <Text className="text-green-200 text-sm">← Voltar</Text>
          </TouchableOpacity>

          <Text className="text-white text-2xl font-bold mb-2">
            Redefinir Senha
          </Text>
          <Text className="text-green-200 text-sm mb-6">
            Informe seu MASP para redefinir a senha
          </Text>

          <View className="bg-white rounded-2xl p-6 shadow-lg">
            <Text className="text-gray-600 text-sm mb-1">MASP (Matrícula)</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-gray-800"
              placeholder="Seu número de matrícula"
              value={matricula}
              onChangeText={setMatricula}
            />

            <Text className="text-gray-600 text-sm mb-1">Nova senha</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-gray-800"
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <Text className="text-gray-600 text-sm mb-1">Confirmar nova senha</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 mb-6 text-gray-800"
              placeholder="Repita a senha"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <TouchableOpacity
              className="bg-primary rounded-lg py-4 items-center"
              onPress={handleReset}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  Redefinir senha
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
