import { useState, useEffect } from "react";
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
import Svg, { Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { useAuthStore } from "../../store/authStore";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    selectAccount: true,
  });

  useEffect(() => {
    if (response?.type === "success") {
      const accessToken = response.authentication?.accessToken;
      if (accessToken) {
        handleGoogleToken(accessToken);
      }
    } else if (response?.type === "error") {
      setGoogleLoading(false);
      Alert.alert("Erro", "Falha na autenticação com Google");
    } else if (response?.type === "dismiss") {
      setGoogleLoading(false);
    }
  }, [response]);

  async function handleGoogleToken(accessToken: string) {
    try {
      const result = await loginWithGoogle(accessToken);
      if (result.requiresRegistration) {
        router.replace("/(auth)/complete-google-profile");
      } else {
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      Alert.alert(
        "Erro",
        err?.response?.data?.error || "Falha ao autenticar com Google"
      );
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    await promptAsync();
  }

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

            {/* Divider */}
            <View className="flex-row items-center mt-5 mb-4">
              <View className="flex-1 h-px bg-gray-200" />
              <Text className="text-gray-400 text-xs mx-3">ou</Text>
              <View className="flex-1 h-px bg-gray-200" />
            </View>

            {/* Google Sign-In */}
            <TouchableOpacity
              className="border border-gray-300 rounded-lg py-3 px-4 flex-row items-center justify-center mb-4"
              onPress={handleGoogleLogin}
              disabled={googleLoading || !request}
            >
              {googleLoading ? (
                <ActivityIndicator color="#4285F4" size="small" />
              ) : (
                <>
                  <Svg width={18} height={18} viewBox="0 0 48 48" style={{ marginRight: 8 }}>
                    <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </Svg>
                  <Text className="text-gray-700 font-medium text-sm">
                    Entrar com Google institucional
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View className="flex-row justify-center mt-2">
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
