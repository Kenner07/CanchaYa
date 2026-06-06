import { getApiBaseUrl, readSessionUser } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

export const options = {
  headerShown: true,
};

export default function CanchaDetailsScreen() {
  const router = useRouter();
  const [previewVisible, setPreviewVisible] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [availability, setAvailability] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    rating?: string;
    address?: string;
    distance?: string;
    status?: string;
    latitude?: string;
    longitude?: string;
    precio?: string;
    horario?: string;
    superficie?: string;
    capacidad?: string;
    imageUrl?: string;
  }>();

  const latitude =
    params.latitude && params.latitude !== "null"
      ? Number(params.latitude)
      : null;
  const longitude =
    params.longitude && params.longitude !== "null"
      ? Number(params.longitude)
      : null;

  const horarios =
    params.horario && params.horario !== "null"
      ? params.horario
          .split(";")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

  const formatPrice = (value?: string) => {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return "Precio no disponible";
    }

    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(numericValue);
  };

  const imageSource =
    params.imageUrl && params.imageUrl !== "null"
      ? { uri: params.imageUrl }
      : require("@/assets/images/fondo.png");

  const canchaId = Number(params.id || 0);
  const API_URL = getApiBaseUrl();

  const formatMinutes = (value: number) => {
    const hours = Math.floor(value / 60)
      .toString()
      .padStart(2, "0");
    const minutes = (value % 60).toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const toMinutes = (time: string) => {
    const [hours, minutes] = String(time || "00:00")
      .split(":")
      .map(Number);
    return hours * 60 + minutes;
  };

  const formatDateLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (_event: unknown, date?: Date) => {
    setShowDatePicker(false);

    if (date) {
      setSelectedDate(formatDateLocal(date));
    }
  };

  const loadAvailability = async () => {
    if (!canchaId || !selectedDate) {
      Alert.alert(
        "Fecha requerida",
        "Ingresa una fecha válida para consultar horarios.",
      );
      return;
    }

    try {
      setAvailabilityLoading(true);
      setSelectedSlot(null);
      const response = await fetch(
        `${API_URL}/api/reservas/disponibilidad?id_cancha=${canchaId}&fecha=${selectedDate}`,
      );
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "No se pudo cargar la disponibilidad.");
      }

      const now = new Date();
      const isToday = selectedDate === formatDateLocal(now);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const bloquesFiltrados = (data.bloques || []).map((slot: any) => {
        const bloquePasado =
          isToday && toMinutes(slot.hora_inicio) <= currentMinutes;

        return {
          ...slot,
          disponible: Boolean(slot.disponible) && !bloquePasado,
          estado: bloquePasado ? "no disponible" : slot.estado,
        };
      });

      setAvailability(bloquesFiltrados);

      if (
        !bloquesFiltrados.some(
          (item: { disponible?: boolean }) => item.disponible,
        )
      ) {
        Alert.alert(
          "Sin disponibilidad",
          "No hay horarios libres para esta fecha.",
        );
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "No se pudo consultar la disponibilidad.",
      );
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleConfirmReservation = async () => {
    if (!selectedSlot) {
      Alert.alert(
        "Selecciona un horario",
        "Elige uno de los bloques disponibles para reservar.",
      );
      return;
    }

    const sessionUser = await readSessionUser();

    if (!sessionUser?.id) {
      Alert.alert("Inicia sesión", "Debes iniciar sesión para reservar.");
      router.push("/login");
      return;
    }

    try {
      setBookingLoading(true);
      const horaFin = formatMinutes(toMinutes(selectedSlot.hora_inicio) + 60);
      const response = await fetch(`${API_URL}/api/reservas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_deportista: sessionUser.id,
          id_cancha: canchaId,
          fecha: selectedDate,
          hora_inicio: selectedSlot.hora_inicio,
          hora_fin: horaFin,
          precio_pagado: Number(params.precio || 0),
          estado: "pendiente",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "No se pudo crear la reserva.");
      }

      Alert.alert(
        "Reserva creada",
        data.message || "Tu reserva quedó registrada.",
      );
      setSelectedSlot(null);
      await loadAvailability();
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "No se pudo crear la reserva.",
      );
    } finally {
      setBookingLoading(false);
    }
  };

  const infoRows = [
    {
      label: "Distancia",
      value:
        params.distance && params.distance !== "null"
          ? params.distance
          : "null",
    },
    {
      label: "Estado",
      value: params.status && params.status !== "null" ? params.status : "null",
    },
    {
      label: "Superficie",
      value:
        params.superficie && params.superficie !== "null"
          ? params.superficie
          : "null",
    },
    {
      label: "Capacidad",
      value:
        params.capacidad && params.capacidad !== "null"
          ? params.capacidad
          : "null",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topActions}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.card}>
          <Pressable onPress={() => setPreviewVisible(true)}>
            <View style={styles.imageWrapper}>
              <Image source={imageSource} style={styles.image} />
              <View style={styles.priceChip}>
                <Text style={styles.priceChipText}>
                  {formatPrice(params.precio)}
                </Text>
              </View>
            </View>
          </Pressable>
          <View style={styles.cardBody}>
            <View style={styles.badgeRow}>
              <View style={styles.statusChip}>
                <Text style={styles.statusChipText}>
                  {params.status || "Estado no disponible"}
                </Text>
              </View>
              <View style={styles.ratingChip}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.ratingText}>{params.rating || "0.0"}</Text>
              </View>
            </View>
            <Text style={styles.cardTitle}>{params.name || "null"}</Text>
            <Text style={styles.cardSubtitle}>
              {params.address && params.address !== "null"
                ? params.address
                : "Dirección no disponible"}
            </Text>
          </View>
        </View>

        <View style={styles.bookingCard}>
          <Text style={styles.sectionTitle}>Reserva rápida</Text>
          <Text style={styles.helperText}>
            Elige una fecha y selecciona el bloque que prefieras.
          </Text>

          <Text style={styles.inputLabel}>Fecha</Text>
          <Pressable
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={18} color="#fff" />
            <Text style={styles.dateButtonText}>{selectedDate}</Text>
          </Pressable>

          {showDatePicker && (
            <DateTimePicker
              value={new Date(selectedDate)}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}

          <View style={styles.bookingActions}>
            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.secondaryButtonPressed,
                availabilityLoading && styles.secondaryButtonDisabled,
              ]}
              onPress={loadAvailability}
              disabled={availabilityLoading}
            >
              <Text style={styles.secondaryButtonText}>
                {availabilityLoading ? "Consultando..." : "Ver disponibilidad"}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.reserveButton,
                pressed && styles.reserveButtonPressed,
                bookingLoading && styles.reserveButtonDisabled,
              ]}
              onPress={handleConfirmReservation}
              disabled={bookingLoading}
            >
              <Text style={styles.reserveButtonText}>
                {bookingLoading ? "Reservando..." : "Reservar ahora"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.slotGrid}>
            {availability.length === 0 ? (
              <Text style={styles.emptySlotText}>
                Consulta la disponibilidad para ver los bloques libres.
              </Text>
            ) : (
              availability.map((slot) => {
                const isSelected =
                  selectedSlot?.hora_inicio === slot.hora_inicio;
                return (
                  <Pressable
                    key={`${slot.hora_inicio}-${slot.hora_fin}`}
                    style={[
                      styles.slotCard,
                      slot.disponible
                        ? styles.slotAvailable
                        : styles.slotOccupied,
                      isSelected && styles.slotSelected,
                    ]}
                    onPress={() => slot.disponible && setSelectedSlot(slot)}
                    disabled={!slot.disponible}
                  >
                    <Text style={styles.slotTime}>
                      {slot.hora_inicio} - {slot.hora_fin}
                    </Text>
                    <Text style={styles.slotState}>
                      {slot.disponible
                        ? "Disponible"
                        : slot.estado === "no disponible"
                          ? "Ya pasó"
                          : "Ocupado"}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </View>
        </View>

        <View style={styles.infoBox}>
          {infoRows.map((item) => (
            <View key={item.label} style={styles.row}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.value}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.scheduleCard}>
          <Text style={styles.sectionTitle}>Horarios</Text>
          {horarios.length > 0 ? (
            <View style={styles.scheduleList}>
              {horarios.map((item) => (
                <View key={item} style={styles.scheduleChip}>
                  <Text style={styles.scheduleChipText}>{item}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyScheduleText}>
              No hay horarios disponibles.
            </Text>
          )}
        </View>

        <View style={styles.mapCard}>
          <Text style={styles.mapTitle}>Ubicación en Google Maps</Text>
          {latitude !== null && longitude !== null ? (
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude,
                longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Marker
                coordinate={{ latitude, longitude }}
                title={params.name || "Cancha"}
              />
            </MapView>
          ) : (
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderText}>
                No hay coordenadas disponibles
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={previewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <Pressable
          style={styles.previewBackdrop}
          onPress={() => setPreviewVisible(false)}
        >
          <View style={styles.previewContainer}>
            <Pressable
              style={styles.previewCloseButton}
              onPress={() => setPreviewVisible(false)}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
            <Image
              source={imageSource}
              style={styles.previewImage}
              resizeMode="contain"
            />
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  content: { padding: 18, paddingBottom: 36 },
  topActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  backButton: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  homeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  homeButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  bookingCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  helperText: {
    color: "#C7D6EA",
    fontSize: 13,
    marginBottom: 10,
  },
  inputLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(7,17,31,0.95)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  dateButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  bookingActions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryButtonPressed: {
    opacity: 0.9,
  },
  secondaryButtonDisabled: {
    opacity: 0.7,
  },
  secondaryButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  reserveButton: {
    flex: 1,
    backgroundColor: "#FFD700",
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  reserveButtonPressed: {
    opacity: 0.9,
  },
  reserveButtonDisabled: {
    opacity: 0.7,
  },
  reserveButtonText: {
    color: "#07111F",
    fontSize: 13,
    fontWeight: "800",
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  slotCard: {
    width: "48%",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  slotAvailable: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderColor: "rgba(34,197,94,0.35)",
  },
  slotOccupied: {
    backgroundColor: "rgba(248,113,113,0.12)",
    borderColor: "rgba(248,113,113,0.25)",
  },
  slotSelected: {
    borderColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  slotTime: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  slotState: {
    color: "#C7D6EA",
    fontSize: 11,
    marginTop: 2,
  },
  emptySlotText: {
    color: "#C7D6EA",
    fontSize: 13,
  },
  title: { color: "#fff", fontSize: 22, fontWeight: "800" },
  card: {
    backgroundColor: "transparent",
    borderRadius: 0,
    overflow: "visible",
    marginBottom: 16,
    borderWidth: 0,
    borderColor: "transparent",
  },
  imageWrapper: { position: "relative" },
  image: { width: "100%", height: 180 },
  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.92)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  previewContainer: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
  },
  previewCloseButton: {
    alignSelf: "flex-end",
    marginBottom: 8,
    padding: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  previewImage: {
    width: "100%",
    height: 360,
    borderRadius: 18,
    backgroundColor: "#111111",
  },
  priceChip: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.35)",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  priceChipText: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "800",
  },
  cardBody: { paddingHorizontal: 14, paddingBottom: 14 },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  statusChip: {
    backgroundColor: "rgba(255, 215, 0, 0.12)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.25)",
  },
  statusChipText: { color: "#FFD700", fontSize: 12, fontWeight: "700" },
  ratingChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4,
  },
  ratingText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  cardTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  cardSubtitle: { color: "#C7D6EA", fontSize: 14, marginTop: 4 },
  infoBox: {
    backgroundColor: "transparent",
    borderRadius: 0,
    padding: 14,
    marginBottom: 16,
    borderWidth: 0,
    borderColor: "transparent",
  },
  scheduleCard: {
    backgroundColor: "transparent",
    borderRadius: 0,
    padding: 14,
    marginBottom: 16,
    borderWidth: 0,
    borderColor: "transparent",
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 10,
  },
  scheduleList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  scheduleChip: {
    backgroundColor: "rgba(255, 215, 0, 0.10)",
    borderWidth: 0,
    borderColor: "transparent",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  scheduleChipText: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyScheduleText: {
    color: "#C7D6EA",
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 0,
    borderBottomColor: "transparent",
    paddingVertical: 8,
  },
  label: { color: "#9FB4CC", fontSize: 14, fontWeight: "600", flex: 1 },
  value: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
    textAlign: "right",
  },
  mapCard: {
    backgroundColor: "transparent",
    borderRadius: 0,
    padding: 14,
    borderWidth: 0,
    borderColor: "transparent",
  },
  mapTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  map: { width: "100%", height: 220, borderRadius: 16 },
  mapPlaceholder: {
    height: 220,
    borderRadius: 16,
    backgroundColor: "rgba(7, 17, 31, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  mapPlaceholderText: { color: "#C7D6EA", fontSize: 14 },
});
