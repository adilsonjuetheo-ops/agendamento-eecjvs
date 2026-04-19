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
import { useAuthStore } from "../../store/authStore";

export default function RegisterScreen() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    matricula: "",
    subjects: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleRegister() {
    const { name, email, matricula, subjects, password, confirmPassword } = form;

    if (!name || !email || !matricula || !subjects || !password) {
      Alert.alert("Erro", "Preencha todos os campos");
      return;
    }

    if (!email.endsWith("@educacao.mg.gov.br")) {
      Alert.alert("Erro", "Use seu email institucional @educacao.mg.gov.br");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Erro", "As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Erro", "A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      await register({ name, email: email.toLowerCase().trim(), matricula, subjects, password });
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Erro", err?.response?.data?.error || "Erro ao cadastrar");
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
          {/* Header */}
          <TouchableOpacity onPress={() => router.back()} className="mb-4">
            <Text className="text-green-200 text-sm">← Voltar</Text>
          </TouchableOpacity>

          <Text className="text-white text-2xl font-bold mb-2">Cadastro</Text>
          <Text className="text-green-200 text-sm mb-6">
            Crie sua conta com email institucional
          </Text>

          {/* Form */}
          <View className="bg-white rounded-2xl p-6 shadow-lg">
            {[
              { label: "Nome completo", field: "name", placeholder: "Seu nome", type: "default" },
              { label: "Email institucional", field: "email", placeholder: "usuario@educacao.mg.gov.br", type: "email-address" },
              { label: "MASP (Matrícula)", field: "matricula", placeholder: "Seu número de matrícula", type: "default" },
              { label: "Disciplinas", field: "subjects", placeholder: "Ex: Matemática, Física", type: "default" },
            ].map(({ label, field, placeholder, type }) => (
              <View key={field} className="mb-4">
                <Text className="text-gray-600 text-sm mb-1">{label}</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                  placeholder={placeholder}
                  keyboardType={type as any}
                  autoCapitalize={type === "email-address" ? "none" : "words"}
                  value={form[field as keyof typeof form]}
                  onChangeText={(v) => update(field as keyof typeof form, v)}
                />
              </View>
            ))}

            <View className="mb-4">
              <Text className="text-gray-600 text-sm mb-1">Senha</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                placeholder="Mínimo 6 caracteres"
                secureTextEntry
                value={form.password}
                onChangeText={(v) => update("password", v)}
              />
            </View>

            <View className="mb-6">
              <Text className="text-gray-600 text-sm mb-1">Confirmar senha</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                placeholder="Repita a senha"
                secureTextEntry
                value={form.confirmPassword}
                onChangeText={(v) => update("confirmPassword", v)}
              />
            </View>

            <TouchableOpacity
              className="bg-primary rounded-lg py-4 items-center"
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  Criar conta
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
