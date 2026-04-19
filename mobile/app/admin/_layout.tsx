import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="index" />
      <Stack.Screen name="reservations" />
      <Stack.Screen name="teachers" />
      <Stack.Screen name="reports" />
    </Stack>
  );
}
