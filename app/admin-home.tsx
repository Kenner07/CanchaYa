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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>Panel de administración</Text>
            <Text style={styles.title}>Hola, {name}</Text>
            <Text style={styles.subtitle}>
              Gestiona las canchas publicadas desde aquí.
            </Text>
          </View>
          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color="#fff" />
          </Pressable>
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
              ? assignedCanchas.map((item) => item.nombre_cancha).join(" · ")
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
              <Text style={styles.cardTitle}>{field.nombre_cancha}</Text>
              <Text style={styles.cardText}>{field.direccion_cancha}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.priceText}>
                  COP {Number(field.precio || 0).toLocaleString("es-CO")}
                </Text>
                <Pressable
                  style={styles.actionButton}
                  onPress={() =>
                    Alert.alert(
                      "Editar",
                      `Próximamente podrás editar ${field.nombre_cancha}.`,
                    )
                  }
                >
                  <Text style={styles.actionButtonText}>Editar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#060606" },
  content: { padding: 18, paddingBottom: 36 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  eyebrow: {
    color: "#FFD700",
    textTransform: "uppercase",
    letterSpacing: 1.6,
    fontSize: 11,
    fontWeight: "700",
  },
  title: { color: "#fff", fontSize: 28, fontWeight: "800", marginTop: 6 },
  subtitle: { color: "rgba(255,255,255,0.72)", marginTop: 4, fontSize: 14 },
  logoutButton: {
    padding: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    flexBasis: "32%",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  statValue: { color: "#fff", fontSize: 18, fontWeight: "800" },
  statLabel: { color: "rgba(255,255,255,0.68)", marginTop: 4, fontSize: 12 },
  assignmentBox: {
    backgroundColor: "rgba(255, 215, 0, 0.08)",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.18)",
    marginBottom: 14,
  },
  assignmentLabel: {
    color: "#FFD700",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    fontWeight: "700",
  },
  assignmentText: {
    color: "#fff",
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
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  secondaryButtonText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cardImage: { width: "100%", height: 140 },
  cardBody: { padding: 12 },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  cardText: { color: "rgba(255,255,255,0.72)", fontSize: 13, marginTop: 4 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  priceText: { color: "#FFD700", fontSize: 13, fontWeight: "700" },
  actionButton: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  actionButtonText: { color: "#000", fontSize: 12, fontWeight: "800" },
});
