import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { reservationsApi, specialDatesApi, Reservation, SpecialDate } from "../services/api";

const CACHE_KEYS = {
  reservations: "cache:reservations",
  specialDates: "cache:special_dates",
  cachedAt: "cache:timestamp",
};

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

interface CachedData {
  reservations: Reservation[];
  specialDates: SpecialDate[];
  isOffline: boolean;
  cachedAt: Date | null;
}

export function useOfflineCache(): CachedData & { refresh: () => Promise<void> } {
  const [data, setData] = useState<CachedData>({
    reservations: [],
    specialDates: [],
    isOffline: false,
    cachedAt: null,
  });

  async function loadFromCache() {
    const [resJson, sdJson, tsStr] = await Promise.all([
      AsyncStorage.getItem(CACHE_KEYS.reservations),
      AsyncStorage.getItem(CACHE_KEYS.specialDates),
      AsyncStorage.getItem(CACHE_KEYS.cachedAt),
    ]);

    return {
      reservations: resJson ? JSON.parse(resJson) : [],
      specialDates: sdJson ? JSON.parse(sdJson) : [],
      cachedAt: tsStr ? new Date(tsStr) : null,
    };
  }

  async function saveToCache(
    reservations: Reservation[],
    specialDates: SpecialDate[]
  ) {
    await Promise.all([
      AsyncStorage.setItem(CACHE_KEYS.reservations, JSON.stringify(reservations)),
      AsyncStorage.setItem(CACHE_KEYS.specialDates, JSON.stringify(specialDates)),
      AsyncStorage.setItem(CACHE_KEYS.cachedAt, new Date().toISOString()),
    ]);
  }

  async function refresh() {
    const netState = await NetInfo.fetch();

    if (!netState.isConnected) {
      const cached = await loadFromCache();
      setData({ ...cached, isOffline: true });
      return;
    }

    try {
      const [resRes, sdRes] = await Promise.all([
        reservationsApi.getAll(),
        specialDatesApi.getAll(),
      ]);
      await saveToCache(resRes.data, sdRes.data);
      setData({
        reservations: resRes.data,
        specialDates: sdRes.data,
        isOffline: false,
        cachedAt: new Date(),
      });
    } catch {
      // falha na rede mesmo estando "conectado" — usa cache
      const cached = await loadFromCache();
      setData({ ...cached, isOffline: true });
    }
  }

  useEffect(() => {
    refresh();

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) refresh();
    });

    return () => unsubscribe();
  }, []);

  return { ...data, refresh };
}
