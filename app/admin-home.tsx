import { clearSession, getApiBaseUrl, readSessionUser } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AdminHomeScreen() {
  const router = useRouter();
  const [name, setName] = useState("Administrador");
  const [role, setRole] = useState("gerente");
  const [userId, setUserId] = useState<number | null>(null);
  const [canchas, setCanchas] = useState<any[]>([]);
  const [reservationsByCancha, setReservationsByCancha] = useState<
    Record<number, any[]>
  >({});
  const [openReservationCanchaId, setOpenReservationCanchaId] = useState<
    number | null
  >(null);
  const [loadingReservations, setLoadingReservations] = useState<
    Record<number, boolean>
  >({});

  useEffect(() => {
    const loadSession = async () => {
      try {
        const parsed = await readSessionUser();

        if (!parsed) {
          return;
        }
        setName(parsed.name || parsed.email || "Administrador");
        setRole(parsed.role || "gerente");
        setUserId(Number(parsed.id) || null);
      } catch (error) {
        console.warn("No se pudo leer la sesión del administrador:", error);
      }
    };

    loadSession();
  }, []);

  useEffect(() => {
    const loadCanchas = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/canchas`);
        const data = await response.json();

        if (response.ok && Array.isArray(data.canchas)) {
          setCanchas(data.canchas);
        }
      } catch (error) {
        console.warn("No se pudo cargar la lista de canchas:", error);
      }
    };

    loadCanchas();
  }, []);

  const assignedCanchas = useMemo(() => {
    if (role === "administrador") {
      return canchas;
    }

    return canchas.filter((item) => Number(item.id_gerente) === Number(userId));
  }, [canchas, role, userId]);

  const stats = useMemo(
    () => [
      { label: "Canchas asignadas", value: String(assignedCanchas.length) },
      {
        label: "Disponibles",
        value: String(
          assignedCanchas.filter((item) => item?.nombre_cancha).length,
        ),
      },
      { label: "Rol", value: role },
    ],
    [assignedCanchas, role],
  );

  const handleLogout = async () => {
    try {
      await clearSession();
    } catch (error) {
      console.warn("No se pudo cerrar la sesión:", error);
    } finally {
      router.replace("/login");
    }
  };

  const parseDateValue = (value?: string | null) => {
    if (!value) {
      return null;
    }

    const candidate = String(value).trim();

    if (!candidate) {
      return null;
    }

    const normalized =
      candidate.includes("T") || candidate.includes(" ")
        ? candidate.replace(" ", "T")
        : `${candidate}T12:00:00`;

    const parsed = new Date(normalized);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatDateLabel = (value?: string | null) => {
    const parsed = parseDateValue(value);

    if (!parsed) {
      return "Sin fecha";
    }

    return parsed.toLocaleDateString("es-CO", {
      weekday: "short",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatDateTimeLabel = (value?: string | null) => {
    const parsed = parseDateValue(value);

    if (!parsed) {
      return "Sin información de creación";
    }

    return parsed.toLocaleString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleUpdateReservaStatus = async (
    idReserva: number,
    nextStatus: "confirmada" | "rechazada",
  ) => {
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/reservas/${idReserva}/estado`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estado: nextStatus, id_gerente: userId }),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "No se pudo actualizar la reserva.");
      }

      setReservationsByCancha((prev) => {
        const nextEntries = Object.entries(prev).map(([canchaId, items]) => [
          Number(canchaId),
          (items || []).map((item) =>
            item.id_reserva === idReserva
              ? { ...item, estado: nextStatus }
              : item,
          ),
        ]);

        return Object.fromEntries(nextEntries) as Record<number, any[]>;
      });

      Alert.alert(
        nextStatus === "confirmada" ? "Reserva aprobada" : "Reserva rechazada",
        data?.message || "Estado actualizado.",
      );
    } catch (error: any) {
      console.warn("No se pudo actualizar la reserva:", error);
      Alert.alert("Error", String(error?.message || error));
    }
  };

  const handleToggleReservations = async (field: any) => {
    const idCancha = Number(field?.id_cancha || 0);

    if (!idCancha) {
      return;
    }

    if (openReservationCanchaId === idCancha) {
      setOpenReservationCanchaId(null);
      return;
    }

    if (reservationsByCancha[idCancha]) {
      setOpenReservationCanchaId(idCancha);
      return;
    }

    setLoadingReservations((prev) => ({ ...prev, [idCancha]: true }));

    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/reservas/cancha/${idCancha}`,
      );
      const rawText = await response.text();

      let data: any = {};

      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        throw new Error(
          `Respuesta inválida del servidor (${response.status}). Reinicia el backend si sigue ocurriendo.`,
        );
      }

      if (!response.ok || !Array.isArray(data.reservas)) {
        throw new Error(data?.message || "No se pudieron cargar las reservas.");
      }

      setReservationsByCancha((prev) => ({
        ...prev,
        [idCancha]: data.reservas,
      }));
      setOpenReservationCanchaId(idCancha);
    } catch (error) {
      console.warn("No se pudieron cargar las reservas:", error);
      Alert.alert(
        "Error",
        "No se pudieron cargar las reservas de esta cancha.",
      );
    } finally {
      setLoadingReservations((prev) => ({ ...prev, [idCancha]: false }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.eyebrow}>Panel de administración</Text>
            <Text style={styles.title}>Hola, {name}</Text>
            <Text style={styles.subtitle}>
              Gestiona las canchas publicadas desde aquí.
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.secondaryHeaderButton}
              onPress={() => router.push("/")}
            >
              <Text style={styles.secondaryHeaderButtonText}>Menú normal</Text>
            </Pressable>
            <Pressable style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color="#fff" />
            </Pressable>
          </View>
        </View>

        <View style={styles.statsRow}>
          {stats.map((item) => (
            <View key={item.label} style={styles.statCard}>
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.assignmentBox}>
          <Text style={styles.assignmentLabel}>
            Cancha(s) asignada(s) a tu perfil
          </Text>
          <Text style={styles.assignmentText}>
            {assignedCanchas.length > 0
              ? assignedCanchas
                  .map((item) => item.nombre_complejo || item.nombre_cancha)
                  .filter(Boolean)
                  .join(" · ")
              : "No hay canchas asignadas a este usuario."}
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Canchas publicadas</Text>
          <Pressable
            style={styles.secondaryButton}
            onPress={() =>
              Alert.alert(
                "Próximamente",
                "Aquí se habilitará la edición y publicación de canchas.",
              )
            }
          >
            <Text style={styles.secondaryButtonText}>Gestionar</Text>
          </Pressable>
        </View>

        {assignedCanchas.map((field) => (
          <View key={field.id_cancha} style={styles.card}>
            <Image
              source={
                field.imagen_url
                  ? { uri: field.imagen_url }
                  : require("@/assets/images/fondo.png")
              }
              style={styles.cardImage}
            />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>
                {field.nombre_complejo || field.nombre_cancha}
              </Text>
              <Text style={styles.cardText}>{field.direccion_cancha}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.priceText}>
                  COP {Number(field.precio || 0).toLocaleString("es-CO")}
                </Text>
                <View style={styles.buttonGroup}>
                  <Pressable
                    style={styles.actionButton}
                    onPress={() =>
                      router.push({
                        pathname: "/cancha-details",
                        params: {
                          id: String(field.id_cancha ?? ""),
                          id_complejo: String(
                            field.id_complejo ?? field.id_cancha ?? "",
                          ),
                          name: field.nombre_complejo || field.nombre_cancha,
                          address: field.direccion_cancha || "",
                          precio: String(field.precio ?? "0"),
                          superficie: field.superficie || "",
                          imageUrl: field.imagen_url || "",
                          fromAdmin: "1",
                        },
                      })
                    }
                  >
                    <Text style={styles.actionButtonText}>Editar</Text>
                  </Pressable>
                  <Pressable
                    style={styles.secondaryActionButton}
                    onPress={() => handleToggleReservations(field)}
                  >
                    <Text style={styles.secondaryActionText}>
                      Gestionar reservas
                    </Text>
                  </Pressable>
                </View>
              </View>

              {openReservationCanchaId === Number(field.id_cancha) && (
                <View style={styles.reservationsPanel}>
                  {loadingReservations[Number(field.id_cancha)] ? (
                    <Text style={styles.emptyText}>Cargando reservas...</Text>
                  ) : (reservationsByCancha[Number(field.id_cancha)] || [])
                      .length > 0 ? (
                    (reservationsByCancha[Number(field.id_cancha)] || []).map(
                      (reserva) => (
                        <View
                          key={reserva.id_reserva}
                          style={styles.reservationCard}
                        >
                          <Text style={styles.reservationTitle}>
                            {reserva.nombre_deportista || "Usuario sin nombre"}
                          </Text>
                          <Text style={styles.reservationMeta}>
                            Fecha de reserva: {formatDateLabel(reserva.fecha)} ·{" "}
                            {reserva.hora_inicio} a {reserva.hora_fin}
                          </Text>
                          <Text style={styles.reservationMeta}>
                            Reservado el:{" "}
                            {formatDateTimeLabel(reserva.fecha_creacion)}
                          </Text>
                          <Text style={styles.reservationMeta}>
                            Contacto: {reserva.correo || "Sin correo"}
                          </Text>
                          <Text style={styles.reservationMeta}>
                            Teléfono: {reserva.telefono || "Sin teléfono"}
                          </Text>
                          <Text style={styles.reservationStatus}>
                            Estado: {reserva.estado || "pendiente"}
                          </Text>
                          {String(
                            reserva.estado || "pendiente",
                          ).toLowerCase() === "pendiente" && (
                            <View style={styles.approvalButtons}>
                              <Pressable
                                style={styles.approveButton}
                                onPress={() =>
                                  handleUpdateReservaStatus(
                                    reserva.id_reserva,
                                    "confirmada",
                                  )
                                }
                              >
                                <Text style={styles.approveButtonText}>
                                  Aprobar
                                </Text>
                              </Pressable>
                              <Pressable
                                style={styles.rejectButton}
                                onPress={() =>
                                  handleUpdateReservaStatus(
                                    reserva.id_reserva,
                                    "rechazada",
                                  )
                                }
                              >
                                <Text style={styles.rejectButtonText}>
                                  Rechazar
                                </Text>
                              </Pressable>
                            </View>
                          )}
                        </View>
                      ),
                    )
                  ) : (
                    <Text style={styles.emptyText}>
                      No hay reservas registradas para esta cancha.
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1F1F1F" },
  content: { padding: 18, paddingBottom: 36 },
  headerRow: {
    position: "relative",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "nowrap",
    columnGap: 10,
    rowGap: 10,
    marginBottom: 18,
    paddingRight: 110,
  },
  headerTextBlock: {
    flex: 1,
    minWidth: 0,
    paddingRight: 6,
  },
  eyebrow: {
    color: "#16A34A",
    textTransform: "uppercase",
    letterSpacing: 1.6,
    fontSize: 11,
    fontWeight: "700",
  },
  title: { color: "#F9FAFB", fontSize: 26, fontWeight: "800", marginTop: 6 },
  subtitle: { color: "#C7C7C7", marginTop: 4, fontSize: 13 },
  headerActions: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 2,
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  logoutButton: {
    padding: 10,
    borderRadius: 999,
    backgroundColor: "#22C55E",
  },
  secondaryHeaderButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#2A2A2A",
    borderWidth: 1,
    borderColor: "#3A3A3A",
  },
  secondaryHeaderButtonText: {
    color: "#F9FAFB",
    fontSize: 11,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    flexBasis: "32%",
    backgroundColor: "#2A2A2A",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#3A3A3A",
  },
  statValue: { color: "#F9FAFB", fontSize: 18, fontWeight: "800" },
  statLabel: { color: "#C7C7C7", marginTop: 4, fontSize: 12 },
  assignmentBox: {
    backgroundColor: "rgba(34,197,94,0.10)",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.22)",
    marginBottom: 14,
  },
  assignmentLabel: {
    color: "#16A34A",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    fontWeight: "700",
  },
  assignmentText: {
    color: "#F9FAFB",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: { color: "#F9FAFB", fontSize: 18, fontWeight: "800" },
  secondaryButton: {
    backgroundColor: "#2A2A2A",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  secondaryButtonText: { color: "#F9FAFB", fontSize: 12, fontWeight: "700" },
  card: {
    backgroundColor: "#2A2A2A",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#3A3A3A",
  },
  cardImage: { width: "100%", height: 140 },
  cardBody: { padding: 12 },
  cardTitle: { color: "#F9FAFB", fontSize: 16, fontWeight: "800" },
  cardText: { color: "#C7C7C7", fontSize: 13, marginTop: 4 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    gap: 10,
  },
  buttonGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 8,
  },
  priceText: { color: "#16A34A", fontSize: 13, fontWeight: "700" },
  actionButton: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  secondaryActionButton: {
    backgroundColor: "#333333",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#3A3A3A",
  },
  actionButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  secondaryActionText: { color: "#F9FAFB", fontSize: 12, fontWeight: "700" },
  reservationsPanel: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  reservationCard: {
    backgroundColor: "#333333",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#3A3A3A",
  },
  reservationTitle: { color: "#F9FAFB", fontSize: 14, fontWeight: "800" },
  reservationMeta: {
    color: "#C7C7C7",
    fontSize: 12,
    marginTop: 2,
  },
  reservationStatus: {
    color: "#16A34A",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "700",
  },
  approvalButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  approveButton: {
    flex: 1,
    backgroundColor: "rgba(76, 175, 80, 0.18)",
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.45)",
  },
  approveButtonText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "700",
  },
  rejectButton: {
    flex: 1,
    backgroundColor: "rgba(255, 107, 107, 0.14)",
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.35)",
  },
  rejectButtonText: {
    color: "#FFC4C4",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyText: { color: "#C7C7C7", fontSize: 12 },
});
