import { ActivityIndicator, Alert, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { router } from "expo-router";

export function AppleSignInButton() {
  const [loading, setLoading] = useState(false);
  const loginWithApple = useAuthStore((s) => s.loginWithApple);

  async function handleAppleLogin() {
    try {
      setLoading(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("Token da Apple ausente");
      }

      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(" ")
        .trim();

      await loginWithApple({
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode || undefined,
        email: credential.email || undefined,
        fullName: fullName || undefined,
      });

      router.replace("/");
    } catch (err: any) {
      if (err?.code === "ERR_REQUEST_CANCELED") return;
      const backendMessage =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null);
      Alert.alert(
        "Erro",
        backendMessage || err?.message || "Falha ao autenticar com Apple"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={10}
        style={{ width: "100%", height: 46 }}
        onPress={handleAppleLogin}
      />
      {loading ? (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator color="#fff" />
        </View>
      ) : null}
    </View>
  );
}
