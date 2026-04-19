import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { Reservation } from "../services/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("reservations", {
      name: "Agendamentos",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#1a5c2e",
    });
  }

  return "granted";
}

export async function scheduleReservationReminder(
  reservation: Reservation
): Promise<string | null> {
  const startTime = new Date(reservation.startTime);
  const reminderTime = new Date(startTime.getTime() - 60 * 60 * 1000); // 1h antes

  if (reminderTime <= new Date()) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Lembrete de agendamento 📅",
      body: `Seu uso de "${reservation.room}" começa em 1 hora (${startTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })})`,
      data: { reservationId: reservation.id },
      sound: true,
    },
    trigger: {
      date: reminderTime,
      channelId: "reservations",
    },
  });

  return id;
}

export async function cancelReservationReminder(
  notificationId: string
): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function useNotificationListener() {
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    notificationListener.current =
      Notifications.addNotificationReceivedListener(() => {
        // notificação recebida com app aberto
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener(() => {
        // usuário tocou na notificação
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);
}
