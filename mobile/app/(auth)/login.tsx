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
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import { useAuthStore } from "../../store/authStore";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Erro", "Preencha email e senha");
      return;
    }

    if (!email.endsWith("@educacao.mg.gov.br")) {
      Alert.alert("Erro", "Use seu email institucional @educacao.mg.gov.br");
      return;
    }

    setLoading(true);
    try {
      await login(email.toLowerCase().trim(), password);
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert(
        "Erro",
        err?.response?.data?.error || "Erro ao fazer login"
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
          {/* Header */}
          <View className="items-center mb-10">
            <Image
              source={require("../../assets/icon.png")}
              className="w-24 h-24 rounded-2xl"
              resizeMode="contain"
            />
            <Text className="text-white text-2xl font-bold mt-4">
              Agendamento EECJVS
            </Text>
            <Text className="text-slate-300 text-sm mt-1">
              E.E. Cel. José Venâncio de Souza
            </Text>
          </View>

          {/* Form */}
          <View className="bg-white rounded-2xl p-6 shadow-lg">
            <Text className="text-gray-700 text-lg font-semibold mb-5">
              Entrar
            </Text>

            <Text className="text-gray-600 text-sm mb-1">Email institucional</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-gray-800"
              placeholder="usuario@educacao.mg.gov.br"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text className="text-gray-600 text-sm mb-1">Senha</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 mb-2 text-gray-800"
              placeholder="Sua senha"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Link href="/(auth)/forgot-password" asChild>
              <TouchableOpacity className="mb-6">
                <Text className="text-primary text-sm text-right">
                  Esqueci minha senha
                </Text>
              </TouchableOpacity>
            </Link>

            <TouchableOpacity
              className="bg-primary rounded-lg py-4 items-center"
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  Entrar
                </Text>
              )}
            </TouchableOpacity>

            <View className="flex-row justify-center mt-4">
              <Text className="text-gray-600 text-sm">Não tem conta? </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text className="text-primary text-sm font-semibold">
                    Cadastrar-se
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>

        </View>
      </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
