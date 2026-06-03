import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
    Image,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

export default function CanchaDetailsScreen() {
  const router = useRouter();
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
  }>();

  const latitude =
    params.latitude && params.latitude !== "null"
      ? Number(params.latitude)
      : null;
  const longitude =
    params.longitude && params.longitude !== "null"
      ? Number(params.longitude)
      : null;

  const infoRows = [
    { label: "Nombre", value: params.name || "null" },
    {
      label: "Dirección",
      value:
        params.address && params.address !== "null" ? params.address : "null",
    },
    {
      label: "Valoración",
      value: params.rating && params.rating !== "null" ? params.rating : "null",
    },
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
      label: "Precio",
      value: params.precio && params.precio !== "null" ? params.precio : "null",
    },
    {
      label: "Horario",
      value:
        params.horario && params.horario !== "null" ? params.horario : "null",
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
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.title}>Detalle de la cancha</Text>
        </View>

        <View style={styles.card}>
          <Image
            source={require("@/assets/images/fondo.png")}
            style={styles.image}
          />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  content: { padding: 18, paddingBottom: 36 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  backButton: {
    marginRight: 12,
    padding: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  title: { color: "#fff", fontSize: 22, fontWeight: "800" },
  card: {
    backgroundColor: "#111111",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  image: { width: "100%", height: 180 },
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
    backgroundColor: "#111111",
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
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
    backgroundColor: "#111111",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
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
