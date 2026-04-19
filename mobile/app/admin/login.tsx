import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useAdminAuthStore } from "../../store/authStore";

export default function AdminLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAdminAuthStore((s) => s.login);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Erro", "Preencha email e senha");
      return;
    }

    setLoading(true);
    try {
      await login(email.toLowerCase().trim(), password);
      router.replace("/admin");
    } catch (err: any) {
      Alert.alert("Erro", err?.response?.data?.error || "Credenciais inválidas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-900"
    >
      <View className="flex-1 justify-center px-6">
        <TouchableOpacity onPress={() => router.back()} className="mb-8">
          <Text className="text-gray-400 text-sm">← Voltar</Text>
        </TouchableOpacity>

        <View className="mb-8">
          <Text className="text-white text-3xl font-bold">Administração</Text>
          <Text className="text-gray-400 text-sm mt-1">
            Acesso restrito à supervisão/coordenação
          </Text>
        </View>

        <View className="bg-gray-800 rounded-2xl p-6">
          <Text className="text-gray-400 text-xs mb-1">Email</Text>
          <TextInput
            className="border border-gray-600 rounded-lg px-4 py-3 mb-4 text-white bg-gray-700"
            placeholder="Email administrativo"
            placeholderTextColor="#6b7280"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text className="text-gray-400 text-xs mb-1">Senha</Text>
          <TextInput
            className="border border-gray-600 rounded-lg px-4 py-3 mb-6 text-white bg-gray-700"
            placeholder="Senha"
            placeholderTextColor="#6b7280"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            className="bg-accent rounded-lg py-4 items-center"
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">
                Acessar painel
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
