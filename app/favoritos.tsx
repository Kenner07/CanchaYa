import { fetchJson, readSessionUser, resolveImageUrl } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FavoritosScreen() {
  const router = useRouter();
  const [favoritos, setFavoritos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFavoritos = async () => {
      try {
        const sessionUser = await readSessionUser();
        if (!sessionUser?.id) {
          router.replace("/login");
          return;
        }

        const data = await fetchJson(
          `/api/favoritos/detalle?usuario_id=${sessionUser.id}`,
        );

        if (!data.ok) {
          throw new Error(
            data.message || "No se pudieron cargar los favoritos.",
          );
        }

        setFavoritos(data.favoritos || []);
      } catch (error) {
        console.warn("Error cargando favoritos:", error);
      } finally {
        setLoading(false);
      }
    };

    loadFavoritos();
  }, [router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#16A34A" />
        </Pressable>
        <Text style={styles.title}>Mis favoritos</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#22C55E" />
        </View>
      ) : favoritos.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            No tienes canchas marcadas como favoritas.
          </Text>
        </View>
      ) : (
        <FlatList
          data={favoritos}
          keyExtractor={(item) => String(item.id_complejo ?? item.id_cancha)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: "/cancha-details",
                  params: {
                    id: String(item.id_cancha),
                    id_complejo: String(item.id_complejo ?? item.id_cancha),
                    name: item.nombre_complejo || item.nombre_cancha,
                    rating: String(item.valoracion || 0),
                    address: item.direccion_cancha || "null",
                    distance: "1.2 km",
                    status: "Disponible ahora",
                    latitude: String(item.latitud ?? "null"),
                    longitude: String(item.longitud ?? "null"),
                    precio: String(item.precio ?? "null"),
                    horario: item.horario ?? "null",
                    superficie: item.superficie ?? "null",
                    capacidad: item.capacidad ?? "null",
                    imageUrl: item.imagen_url || "null",
                  },
                })
              }
            >
              <Image
                source={
                  resolveImageUrl(item.imagen_url)
                    ? { uri: resolveImageUrl(item.imagen_url) as string }
                    : require("@/assets/images/fondo.png")
                }
                style={styles.image}
              />
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>
                  {item.nombre_complejo || item.nombre_cancha}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {item.direccion_cancha || "Sin dirección"}
                </Text>
                <View style={styles.badgeRow}>
                  <Text style={styles.priceText}>
                    $ {Number(item.precio || 0).toLocaleString("es-CO")}
                  </Text>
                  <View style={styles.favoriteChip}>
                    <Ionicons name="heart" size={14} color="#22C55E" />
                  </View>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1F1F1F" },
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
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  priceText: { color: "#22C55E", fontSize: 13, fontWeight: "800" },
  favoriteChip: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderRadius: 999,
    padding: 6,
  },
});
