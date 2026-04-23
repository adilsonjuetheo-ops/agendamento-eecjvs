import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { useAuthStore } from "../../store/authStore";

export default function ProfileScreen() {
  const { teacher, logout, deleteAccount } = useAuthStore();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handlePickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão negada", "Precisamos de acesso à galeria");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatar(result.assets[0].uri);
      await SecureStore.setItemAsync("avatar_uri", result.assets[0].uri);
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Excluir conta",
      "Tem certeza que deseja excluir sua conta? Todos os seus dados serão removidos permanentemente.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Confirmação final",
              "Esta ação é irreversível. Sua conta e todos os agendamentos serão excluídos. Confirma?",
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Sim, excluir permanentemente",
                  style: "destructive",
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      await deleteAccount();
                    } catch {
                      setDeleting(false);
                      Alert.alert("Erro", "Não foi possível excluir a conta. Tente novamente.");
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }

  async function handleLogout() {
    Alert.alert("Sair", "Deseja realmente sair?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          setLoggingOut(true);
          await logout();
        },
      },
    ]);
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-primary px-5 pt-14 pb-8 items-center">
        <TouchableOpacity onPress={handlePickImage} className="relative">
          {avatar ? (
            <Image
              source={{ uri: avatar }}
              className="w-24 h-24 rounded-full border-4 border-white"
            />
          ) : (
            <View className="w-24 h-24 rounded-full bg-white/20 border-4 border-white items-center justify-center">
              <Text className="text-white text-4xl">
                {teacher?.name?.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View className="absolute bottom-0 right-0 bg-accent rounded-full w-7 h-7 items-center justify-center">
            <Text className="text-white text-xs">✏️</Text>
          </View>
        </TouchableOpacity>

        <Text className="text-white text-xl font-bold mt-3">{teacher?.name}</Text>
        <Text className="text-blue-200 text-sm">{teacher?.email}</Text>
        <Text className="text-blue-100 text-xs mt-1">
          {teacher?.userRole === "autorizado" ? "Usuário da instituição" : "Visitante"}
        </Text>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Dados */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-gray-500 text-xs font-semibold uppercase mb-3">
            Dados da conta
          </Text>

          {[
            { label: "Nome completo", value: teacher?.name },
            { label: "Email", value: teacher?.email },
            { label: "Perfil de acesso", value: teacher?.userRole || "visitante" },
            { label: "MASP", value: teacher?.matricula },
            { label: "Disciplinas", value: teacher?.subjects },
          ].map(({ label, value }) => (
            <View key={label} className="mb-3">
              <Text className="text-gray-500 text-xs">{label}</Text>
              <Text className="text-gray-800 text-sm font-medium mt-0.5">
                {value || "—"}
              </Text>
            </View>
          ))}
        </View>

        {/* Info escola */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-gray-500 text-xs font-semibold uppercase mb-3">
            Escola
          </Text>
          <Text className="text-gray-800 text-sm font-medium">
            E.E. Cel. José Venâncio de Souza
          </Text>
          <Text className="text-gray-500 text-xs mt-0.5">
            Rede Estadual — Minas Gerais
          </Text>
        </View>

        {/* Logout */}
        <TouchableOpacity
          className="bg-red-50 border border-red-200 rounded-xl py-4 items-center mb-3"
          onPress={handleLogout}
          disabled={loggingOut || deleting}
        >
          {loggingOut ? (
            <ActivityIndicator color="#dc2626" />
          ) : (
            <Text className="text-red-600 font-semibold">Sair da conta</Text>
          )}
        </TouchableOpacity>

        {/* Excluir conta */}
        <TouchableOpacity
          className="py-4 items-center mb-10"
          onPress={handleDeleteAccount}
          disabled={deleting || loggingOut}
        >
          {deleting ? (
            <ActivityIndicator color="#9ca3af" size="small" />
          ) : (
            <Text className="text-gray-400 text-sm">Excluir minha conta</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
