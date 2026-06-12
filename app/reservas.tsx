import { fetchJson, readSessionUser, resolveImageUrl } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    SectionList,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const formatReservationDate = (value: string) => {
  if (!value) return "Sin fecha";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();

  return `${day}-${month}-${year}`;
};

const isReservationPassed = (item: any) => {
  const reservationDate = new Date(item?.fecha || "");

  if (Number.isNaN(reservationDate.getTime())) {
    return false;
  }

  const [hours = 0, minutes = 0] = String(item?.hora_fin || "00:00")
    .split(":")
    .map(Number);

  reservationDate.setHours(hours, minutes, 0, 0);

  return new Date() > reservationDate;
};

export default function ReservasScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [reservas, setReservas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const pendientes = reservas.filter(
    (item) => String(item.estado || "").toLowerCase() === "pendiente",
  );
  const pasadas = reservas.filter(
    (item) => String(item.estado || "").toLowerCase() !== "pendiente",
  );

  useEffect(() => {
    const loadReservas = async () => {
      try {
        const sessionUser = await readSessionUser();
        if (!sessionUser?.id) {
          router.replace("/login");
          return;
        }

        const data = await fetchJson(`/api/reservas/usuario/${sessionUser.id}`);

        if (!data.ok) {
          throw new Error(
            data.message || "No se pudieron cargar las reservas.",
          );
        }

        setReservas(data.reservas || []);
      } catch (error) {
        console.warn("Error cargando reservas:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isFocused) {
      loadReservas();
    }
  }, [isFocused, router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#16A34A" />
        </Pressable>
        <Text style={styles.title}>Mis reservas</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#22C55E" />
        </View>
      ) : reservas.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            Aún no tienes reservas registradas.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={[
            {
              title: "Pendientes",
              data: pendientes,
              emptyText: "No hay reservas pendientes",
            },
            {
              title: "Pasadas",
              data: pasadas,
              emptyText: "No hay reservas pasadas",
            },
          ]}
          keyExtractor={(item) => String(item.id_reserva)}
          contentContainerStyle={styles.list}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          renderSectionFooter={({ section }) =>
            section.data.length === 0 ? (
              <Text style={styles.emptySectionText}>{section.emptyText}</Text>
            ) : null
          }
          renderItem={({ item }) => {
            const passed = isReservationPassed(item);
            const estadoLabel = passed
              ? "Pasada"
              : String(item.estado || "pendiente");

            return (
              <View style={styles.card}>
                <Image
                  source={
                    resolveImageUrl(item.imagen_url)
                      ? { uri: resolveImageUrl(item.imagen_url) as string }
                      : require("@/assets/images/fondo.png")
                  }
                  style={styles.image}
                />
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.nombre_cancha}</Text>
                  <Text style={styles.cardSubtitle}>
                    {item.direccion_cancha || "Sin dirección"}
                  </Text>
                  <View style={styles.metaBox}>
                    <View style={styles.metaItem}>
                      <Ionicons
                        name="calendar-outline"
                        size={13}
                        color="#86EFAC"
                      />
                      <Text style={styles.cardDate}>
                        {formatReservationDate(item.fecha)}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={13} color="#86EFAC" />
                      <Text style={styles.cardDate}>
                        {item.hora_inicio} - {item.hora_fin}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        passed
                          ? styles.statusPassed
                          : item.estado === "confirmada"
                            ? styles.statusConfirmed
                            : styles.statusPending,
                      ]}
                    >
                      <Text style={styles.statusText}>{estadoLabel}</Text>
                    </View>
                    <Text style={styles.priceText}>
                      ${" "}
                      {Number(item.precio_pagado || 0).toLocaleString("es-CO")}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1F1F1F" },
  sectionBlock: { marginBottom: 8 },
  sectionTitle: {
    color: "#F9FAFB",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 4,
    marginBottom: 4,
  },
  sectionSpacer: { height: 6 },
  emptySectionText: { color: "#C7C7C7", fontSize: 12, marginBottom: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(76, 175, 80, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  title: { color: "#F9FAFB", fontSize: 20, fontWeight: "800" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: { color: "#C7C7C7", fontSize: 14, textAlign: "center" },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: "#2A2A2A",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  image: { width: "100%", height: 120 },
  cardBody: { padding: 12 },
  cardTitle: { color: "#F9FAFB", fontSize: 16, fontWeight: "800" },
  cardSubtitle: { color: "#C7C7C7", fontSize: 12, marginTop: 4 },
  metaBox: { marginTop: 6, gap: 4 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardDate: { color: "#D1FAE5", fontSize: 13, fontWeight: "700" },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  statusBadge: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10 },
  statusConfirmed: { backgroundColor: "rgba(34,197,94,0.14)" },
  statusPending: { backgroundColor: "rgba(245,158,11,0.14)" },
  statusPassed: { backgroundColor: "rgba(148,163,184,0.18)" },
  statusText: {
    color: "#F9FAFB",
    textTransform: "capitalize",
    fontSize: 12,
    fontWeight: "700",
  },
  priceText: { color: "#22C55E", fontSize: 13, fontWeight: "800" },
});
