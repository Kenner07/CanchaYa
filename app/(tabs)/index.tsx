import { clearSession, getApiBaseUrl, readSessionUser } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ImageBackground,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "@/styles/home.styles";

export default function HomeScreen() {
  const router = useRouter();
  const [name, setName] = useState("Jugador");
  const [role, setRole] = useState("deportista");
  const [menuOpen, setMenuOpen] = useState(false);
  const [suggestedFields, setSuggestedFields] = useState<any[]>([]);

  const API_URL = getApiBaseUrl();
  const API_TIMEOUT_MS = 15000;

  const fetchWithTimeout = async (url: string, options: RequestInit = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  };

  useEffect(() => {
    const loadCanchas = async () => {
      try {
        const response = await fetchWithTimeout(`${API_URL}/api/canchas`);
        const data = await response.json();

        if (
          response.ok &&
          Array.isArray(data.canchas) &&
          data.canchas.length > 0
        ) {
          setSuggestedFields(
            data.canchas.map((field: any) => ({
              id: String(field.id_cancha),
              name: field.nombre_cancha,
              rating: field.valoracion?.toString() || "0.0",
              address: field.direccion_cancha || null,
              distance: "1.2 km",
              status: "Disponible ahora",
              image: field.imagen_url ? { uri: field.imagen_url } : null,
              imageUrl: field.imagen_url || null,
              latitude: Number(field.latitud),
              longitude: Number(field.longitud),
              horario: field.horario ?? "null",
              precio: field.precio ?? "null",
              superficie: field.superficie ?? "null",
              capacidad: field.capacidad ?? "null",
            })),
          );
        }
      } catch (error) {
        console.warn("No se pudieron cargar las canchas desde la API:", error);
        setSuggestedFields([]);
      }
    };

    loadCanchas();
  }, [API_URL]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const parsed = await readSessionUser();

        if (!parsed) {
          setName("Jugador");
          return;
        }

        setName(parsed.name || parsed.email || "Jugador");
        setRole(parsed.role || "deportista");
      } catch (error) {
        console.warn("No se pudo leer la sesión guardada:", error);
        setName("Jugador");
      }
    };

    loadUser();
  }, []);

  const handleLogout = async () => {
    try {
      await clearSession();
    } catch (error) {
      console.warn("No se pudo limpiar la sesión:", error);
    } finally {
      router.replace("/login");
    }
  };

  const handleGoToAdminPanel = () => {
    setMenuOpen(false);
    router.push("/admin-home");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextBlock}>
            <View style={styles.brandRow}>
              <View style={styles.brandIcon}>
                <Ionicons name="football-outline" size={20} color="#4CAF50" />
              </View>
              <Text style={styles.brandText}>CanchaYa</Text>
            </View>
            <Text style={styles.greeting}>¡Hola, {name}!</Text>
            <Text style={styles.heading}>Busca tu cancha cercana</Text>
          </View>

          <View style={styles.topIcons}>
            <Pressable style={styles.searchButton}>
              <Ionicons name="search" size={22} color="#16A34A" />
            </Pressable>
            <View style={styles.avatarContainer}>
              <Pressable
                style={styles.avatar}
                onPress={() => setMenuOpen(!menuOpen)}
              >
                <Ionicons name="person-outline" size={20} color="#16A34A" />
              </Pressable>
              {menuOpen && (
                <View style={styles.dropdownMenu}>
                  <Pressable
                    style={styles.menuItem}
                    onPress={() => {
                      setMenuOpen(false);
                      // Perfil - por implementar
                    }}
                  >
                    <Ionicons
                      name="person-circle-outline"
                      size={18}
                      color="#22C55E"
                    />
                    <Text style={styles.menuItemText}>Perfil</Text>
                  </Pressable>
                  {(role === "administrador" || role === "gerente") && (
                    <>
                      <Pressable
                        style={styles.menuItem}
                        onPress={handleGoToAdminPanel}
                      >
                        <Ionicons
                          name="shield-outline"
                          size={18}
                          color="#22C55E"
                        />
                        <Text style={styles.menuItemText}>
                          Panel de administración
                        </Text>
                      </Pressable>
                      <View style={styles.menuDivider} />
                    </>
                  )}
                  <Pressable style={styles.menuItem} onPress={handleLogout}>
                    <Ionicons
                      name="log-out-outline"
                      size={18}
                      color="#FF6B6B"
                    />
                    <Text style={[styles.menuItemText, { color: "#FF6B6B" }]}>
                      Cerrar sesión
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <Text style={styles.mapLabel}>Cartagena</Text>
            <Text style={styles.mapSubLabel}>Canchas cerca de ti</Text>
          </View>
          <View style={styles.mapPlaceholder}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: 10.3997,
                longitude: -75.5144,
                latitudeDelta: 0.08,
                longitudeDelta: 0.08,
              }}
              showsUserLocation
              showsMyLocationButton={false}
            >
              {suggestedFields.map((field) => (
                <Marker
                  key={field.id}
                  coordinate={{
                    latitude: field.latitude,
                    longitude: field.longitude,
                  }}
                  title={field.name}
                  description={field.status}
                />
              ))}
            </MapView>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Canchas Cercanas Sugeridas</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardList}
        >
          {suggestedFields.map((field) => (
            <View key={field.id} style={styles.card}>
              <ImageBackground
                source={field.image}
                style={styles.cardImage}
                imageStyle={styles.cardImageInner}
              >
                <View style={styles.cardBadge}>
                  <Text style={styles.cardBadgeText}>{field.status}</Text>
                </View>
              </ImageBackground>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{field.name}</Text>
                <View style={styles.cardRow}>
                  <View style={styles.ratingRow}>
                    <Ionicons name="football" size={14} color="#22C55E" />
                    <Text style={styles.cardRating}>{field.rating}</Text>
                  </View>
                  <Text style={styles.cardDistance}>{field.distance}</Text>
                </View>
                <Pressable
                  style={styles.detailButton}
                  onPress={() =>
                    router.push({
                      pathname: "/cancha-details",
                      params: {
                        id: field.id,
                        name: field.name,
                        rating: field.rating,
                        address: field.address ?? "null",
                        distance: field.distance,
                        status: field.status,
                        latitude: String(field.latitude ?? "null"),
                        longitude: String(field.longitude ?? "null"),
                        precio: field.precio ?? "null",
                        horario: field.horario ?? "null",
                        superficie: field.superficie ?? "null",
                        capacidad: field.capacidad ?? "null",
                        imageUrl: field.imageUrl ?? "null",
                      },
                    })
                  }
                >
                  <Text style={styles.detailButtonText}>Ver Detalles</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}
