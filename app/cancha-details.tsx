import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

export const options = {
  headerShown: true,
};

export default function CanchaDetailsScreen() {
  const router = useRouter();
  const [previewVisible, setPreviewVisible] = useState(false);
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
