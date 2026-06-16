import { styles } from "@/styles/home.styles";
import {
  clearSession,
  fetchJson as fetchApiJson,
  getApiBaseUrl,
  readSessionUser,
  resolveImageUrl,
} from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [name, setName] = useState("Jugador");
  const [role, setRole] = useState("deportista");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("Inicio");
  const [suggestedFields, setSuggestedFields] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [reservas, setReservas] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [checkingWelcome, setCheckingWelcome] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [availabilityStatusMap, setAvailabilityStatusMap] = useState<
    Record<string, string>
  >({});

  const API_URL = getApiBaseUrl();

  const WELCOME_SEEN_KEY = "welcome_seen";
  const API_TIMEOUT_MS = 15000;

  const fetchWithTimeout = useCallback(
    async (url: string, options: RequestInit = {}) => {
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
    },
    [API_TIMEOUT_MS],
  );

  const formatDateLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const toMinutes = (value: string) => {
    const [hours = 0, minutes = 0] = String(value || "00:00")
      .split(":")
      .map(Number);
    return hours * 60 + minutes;
  };

  const fetchAvailabilityStatus = useCallback(
    async (canchaId: number) => {
      const fecha = formatDateLocal(new Date());
      const now = new Date();
      const isToday = fecha === formatDateLocal(now);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      try {
        const response = await fetchWithTimeout(
          `${API_URL}/api/reservas/disponibilidad?id_cancha=${canchaId}&fecha=${fecha}`,
        );
        const data = await response.json();

        if (!response.ok || !data.ok || !Array.isArray(data.bloques)) {
          return "No disponible";
        }

        const hasAvailableSlot = data.bloques.some((slot: any) => {
          const isFutureSlot =
            !isToday || toMinutes(slot.hora_inicio) > currentMinutes;

          return Boolean(slot.disponible) && isFutureSlot;
        });

        return hasAvailableSlot ? "Disponible ahora" : "No disponible";
      } catch {
        return "No disponible";
      }
    },
    [API_URL, fetchWithTimeout],
  );

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
          const mappedFields = await Promise.all(
            data.canchas.map(async (field: any) => {
              const status = await fetchAvailabilityStatus(
                Number(field.id_cancha),
              );

              return {
                id: String(field.id_cancha),
                id_complejo: String(field.id_complejo ?? field.id_cancha),
                name: field.nombre_cancha,
                nombre_complejo: field.nombre_complejo || field.nombre_cancha,
                rating: field.valoracion?.toString() || "0.0",
                address: field.direccion_cancha || null,
                distance: "1.2 km",
                status,
                image: field.imagen_url ? { uri: field.imagen_url } : null,
                imageUrl: field.imagen_url || null,
                latitude: Number(field.latitud),
                longitude: Number(field.longitud),
                horario: field.horario ?? "null",
                precio: field.precio ?? "null",
                superficie: field.superficie ?? "null",
                capacidad: field.capacidad ?? "null",
              };
            }),
          );

          setSuggestedFields(mappedFields);

          const statusEntries = Object.fromEntries(
            mappedFields.map((field) => [String(field.id), field.status]),
          );
          setAvailabilityStatusMap(statusEntries);
        }
      } catch {
        console.warn("No se pudieron cargar las canchas desde la API.");
        setSuggestedFields([]);
      }
    };

    loadCanchas();
  }, [API_URL, fetchAvailabilityStatus, fetchWithTimeout]);

  useEffect(() => {
    const checkWelcome = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(WELCOME_SEEN_KEY);

        if (storedValue !== "true") {
          router.replace("/welcome");
          return;
        }

        // Verificar si hay sesión activa
        const sessionUser = await readSessionUser();
        if (!sessionUser?.id) {
          router.replace("/login");
          return;
        }
      } catch (error) {
        console.warn("No se pudo verificar el primer inicio de sesión:", error);
      } finally {
        setCheckingWelcome(false);
      }
    };

    if (isFocused) {
      checkWelcome();
      setActiveSection("Inicio");
    }
  }, [isFocused, router]);

  useEffect(() => {
    const getUserLocation = async () => {
      const fallbackLocation = { latitude: 10.3997, longitude: -75.5144 };

      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();

        if (!servicesEnabled) {
          setUserLocation(fallbackLocation);
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          setUserLocation(fallbackLocation);
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch {
        setUserLocation(fallbackLocation);
      } finally {
        setLoadingLocation(false);
      }
    };

    getUserLocation();
  }, []);

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const sessionUser = await readSessionUser();
        if (!sessionUser?.id) return;

        await fetchApiJson(`/api/favoritos?usuario_id=${sessionUser.id}`);

        const detailData = await fetchApiJson(
          `/api/favoritos/detalle?usuario_id=${sessionUser.id}`,
        );

        if (detailData.ok) {
          setFavorites(detailData.favoritos || []);
        }
      } catch (error) {
        console.warn("No se pudieron cargar favoritos:", error);
      }
    };

    if (isFocused) {
      loadFavorites();
    }
  }, [API_URL, isFocused]);

  useEffect(() => {
    const loadReservas = async () => {
      try {
        const sessionUser = await readSessionUser();
        if (!sessionUser?.id) return;

        const data = await fetchApiJson(
          `/api/reservas/usuario/${sessionUser.id}`,
        );

        if (data.ok) {
          setReservas(data.reservas || []);
        }
      } catch (error) {
        console.warn("No se pudieron cargar reservas:", error);
      }
    };

    if (isFocused) {
      loadReservas();
    }
  }, [isFocused]);

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

  const calculateDistanceKm = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
  };

  const normalizeText = (value: string) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const nearbyFields = useMemo(() => {
    if (!userLocation) return [];

    const query = normalizeText(searchQuery.trim());

    const filtered = suggestedFields.filter((field) => {
      const latitude = Number(field.latitude);
      const longitude = Number(field.longitude);
      const matchesQuery =
        !query ||
        normalizeText(field.nombre_complejo || field.name || "").includes(
          query,
        ) ||
        normalizeText(field.address || "").includes(query) ||
        normalizeText(field.name || "").includes(query);

      return (
        matchesQuery &&
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        calculateDistanceKm(
          userLocation.latitude,
          userLocation.longitude,
          latitude,
          longitude,
        ) <= 2
      );
    });

    const grouped = new Map<string, any>();

    filtered.forEach((field) => {
      const complexId = String(field.id_complejo || field.id);
      const distanceKm = calculateDistanceKm(
        userLocation.latitude,
        userLocation.longitude,
        Number(field.latitude),
        Number(field.longitude),
      );

      if (!grouped.has(complexId)) {
        grouped.set(complexId, {
          ...field,
          id: String(field.id_cancha),
          name: field.nombre_complejo || field.name,
          address: field.address,
          distanceKm,
          canchasCount: 1,
          representativeField: field,
          canchas: [field],
        });
        return;
      }

      const current = grouped.get(complexId);
      current.canchas.push(field);
      current.canchasCount += 1;

      if (distanceKm < current.distanceKm) {
        current.distanceKm = distanceKm;
        current.id = String(field.id_cancha);
        current.name = field.nombre_complejo || field.name;
        current.address = field.address;
        current.representativeField = field;
        current.imageUrl = field.imageUrl;
        current.precio = field.precio;
        current.horario = field.horario;
        current.superficie = field.superficie;
        current.capacidad = field.capacidad;
      }
    });

    return Array.from(grouped.values()).sort(
      (a, b) => a.distanceKm - b.distanceKm,
    );
  }, [searchQuery, suggestedFields, userLocation]);

  const favoriteIds = useMemo(
    () =>
      new Set(
        favorites.map((field) =>
          String(field.id_complejo ?? field.id_cancha ?? field.id ?? ""),
        ),
      ),
    [favorites],
  );

  const isFavoriteField = (id: string | number) => favoriteIds.has(String(id));

  const reservedHistory = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const seen = new Set<string>();

    return (reservas || [])
      .filter((item) => {
        const reservationDate = new Date(item.fecha || "");
        const [hours = 0, minutes = 0] = String(item.hora_fin || "00:00")
          .split(":")
          .map(Number);

        reservationDate.setHours(hours, minutes, 0, 0);

        return reservationDate >= thirtyDaysAgo && reservationDate <= now;
      })
      .filter((item) => {
        const key = String(
          item.id_cancha || item.nombre_cancha || item.direccion_cancha || "",
        );

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      });
  }, [reservas]);

  const handleBottomBarOption = (option: string) => {
    setActiveSection(option);

    if (option === "Favoritos") {
      router.push("/favoritos");
      return;
    }

    if (option === "Reservas") {
      router.push("/reservas");
      return;
    }

    if (option === "Perfil") {
      router.push("/profile");
      return;
    }
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
            <Pressable
              style={styles.searchButton}
              onPress={() => router.push("/map-search" as any)}
            >
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
                      router.push("/profile");
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

        <Pressable
          style={styles.searchBoxContainer}
          onPress={() => router.push("/map-search" as any)}
        >
          <Ionicons name="search" size={18} color="#86EFAC" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Busca cancha o barrio"
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            returnKeyType="search"
            editable={false}
          />
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Canchas cercanas</Text>
          <Text style={styles.sectionSubtitle}>
            En un radio de 2 km desde tu ubicación actual.
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {loadingLocation ? (
            <View style={styles.sectionCard}>
              <View style={styles.emptySection}>
                <ActivityIndicator color="#22C55E" />
                <Text style={styles.emptySectionText}>
                  Obteniendo tu ubicación…
                </Text>
              </View>
            </View>
          ) : nearbyFields.length === 0 ? (
            <View style={styles.sectionCard}>
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>
                  No hay canchas cercanas dentro del radio de 2 km.
                </Text>
              </View>
            </View>
          ) : (
            nearbyFields.map((field) => (
              <Pressable
                key={`${field.id_complejo || field.id}-${field.id}`}
                style={styles.horizontalCard}
                onPress={() =>
                  router.push({
                    pathname: "/cancha-details",
                    params: {
                      id: String(field.representativeField?.id || field.id),
                      id_complejo: String(
                        field.id_complejo ||
                          field.representativeField?.id_complejo ||
                          field.id,
                      ),
                      name: field.name,
                      rating: field.rating,
                      address: field.address ?? "null",
                      distance: `${field.distanceKm.toFixed(1)} km`,
                      status: field.status,
                      latitude: String(
                        field.representativeField?.latitude ??
                          field.latitude ??
                          "null",
                      ),
                      longitude: String(
                        field.representativeField?.longitude ??
                          field.longitude ??
                          "null",
                      ),
                      precio:
                        field.representativeField?.precio ??
                        field.precio ??
                        "null",
                      horario:
                        field.representativeField?.horario ??
                        field.horario ??
                        "null",
                      superficie:
                        field.representativeField?.superficie ??
                        field.superficie ??
                        "null",
                      capacidad:
                        field.representativeField?.capacidad ??
                        field.capacidad ??
                        "null",
                      imageUrl:
                        field.representativeField?.imageUrl ??
                        field.imageUrl ??
                        "null",
                    },
                  })
                }
              >
                {isFavoriteField(field.id) && (
                  <View
                    style={[styles.favoriteChip, styles.favoriteChipActive]}
                  >
                    <Ionicons name="heart" size={14} color="#22C55E" />
                  </View>
                )}
                <Image
                  source={
                    resolveImageUrl(field.imageUrl)
                      ? { uri: resolveImageUrl(field.imageUrl) as string }
                      : require("@/assets/images/fondo.png")
                  }
                  style={styles.horizontalCardImage}
                />
                <View style={styles.horizontalCardBody}>
                  <Text style={styles.horizontalCardTitle}>{field.name}</Text>
                  <Text style={styles.horizontalCardMeta}>
                    {field.address || "Sin dirección"}
                  </Text>
                  <Text style={styles.smallCardDistance}>
                    {availabilityStatusMap[String(field.id)] || "No disponible"}
                  </Text>
                  <View style={styles.smallCardFooter}>
                    <Text style={styles.smallCardDistance}>
                      {field.distanceKm.toFixed(1)} km
                    </Text>
                    <Text style={styles.smallCardPrice}>
                      ${Number(field.precio || 0).toLocaleString("es-CO")}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Favoritas</Text>
          <Text style={styles.sectionSubtitle}>
            Canchas que tienes marcadas como favoritas.
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {favorites.length === 0 ? (
            <View style={styles.sectionCard}>
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>
                  Aún no tienes canchas favoritas.
                </Text>
              </View>
            </View>
          ) : (
            favorites.map((field) => (
              <Pressable
                key={String(field.id_complejo ?? field.id_cancha)}
                style={styles.horizontalCard}
                onPress={() =>
                  router.push({
                    pathname: "/cancha-details",
                    params: {
                      id: String(field.id_cancha),
                      id_complejo: String(field.id_complejo ?? field.id_cancha),
                      name: field.nombre_complejo || field.nombre_cancha,
                      rating: String(field.valoracion || 0),
                      address: field.direccion_cancha || "null",
                      distance: "1.2 km",
                      status:
                        availabilityStatusMap[
                          String(field.id_cancha ?? field.id_complejo)
                        ] || "No disponible",
                      latitude: String(field.latitud ?? "null"),
                      longitude: String(field.longitud ?? "null"),
                      precio: String(field.precio ?? "null"),
                      horario: field.horario ?? "null",
                      superficie: field.superficie ?? "null",
                      capacidad: field.capacidad ?? "null",
                      imageUrl: field.imagen_url || "null",
                    },
                  })
                }
              >
                <Image
                  source={
                    resolveImageUrl(field.imagen_url)
                      ? { uri: resolveImageUrl(field.imagen_url) as string }
                      : require("@/assets/images/fondo.png")
                  }
                  style={styles.horizontalCardImage}
                />
                <View style={styles.horizontalCardBody}>
                  <Text style={styles.horizontalCardTitle}>
                    {field.nombre_complejo || field.nombre_cancha}
                  </Text>
                  <Text style={styles.horizontalCardMeta}>
                    {field.direccion_cancha || "Sin dirección"}
                  </Text>
                  <View style={styles.smallCardFooter}>
                    <Text style={styles.smallCardPrice}>
                      ${Number(field.precio || 0).toLocaleString("es-CO")}
                    </Text>
                    <View style={styles.favoriteChipBottom}>
                      <Ionicons name="heart" size={14} color="#22C55E" />
                    </View>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Reservadas anteriormente</Text>
          <Text style={styles.sectionSubtitle}>
            Canchas que reservaste en los últimos 30 días.
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {reservedHistory.length === 0 ? (
            <View style={styles.sectionCard}>
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>
                  No tienes canchas reservadas en los últimos 30 días.
                </Text>
              </View>
            </View>
          ) : (
            reservedHistory.map((item) => (
              <View key={item.id_reserva} style={styles.horizontalCard}>
                <Image
                  source={
                    resolveImageUrl(item.imagen_url)
                      ? { uri: resolveImageUrl(item.imagen_url) as string }
                      : require("@/assets/images/fondo.png")
                  }
                  style={styles.horizontalCardImage}
                />
                <View style={styles.horizontalCardBody}>
                  <Text style={styles.horizontalCardTitle}>
                    {item.nombre_complejo || item.nombre_cancha || "Complejo"}
                  </Text>
                  <Text style={styles.horizontalCardMeta}>
                    {item.nombre_cancha || item.nombre_complejo || "Cancha"}
                  </Text>
                  <Text style={styles.horizontalCardMeta}>
                    {item.direccion_cancha || "Sin dirección"}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </ScrollView>

      <View style={styles.bottomBar}>
        {[
          { label: "Inicio", icon: "home-outline" },
          { label: "Reservas", icon: "calendar-outline" },
          { label: "Favoritos", icon: "heart-outline" },
          { label: "Perfil", icon: "person-outline" },
        ].map((item) => {
          const isActive = activeSection === item.label;
          return (
            <Pressable
              key={item.label}
              style={[
                styles.bottomBarItem,
                isActive && styles.bottomBarItemActive,
              ]}
              onPress={() => handleBottomBarOption(item.label)}
            >
              <Ionicons
                name={item.icon as any}
                size={18}
                color={isActive ? "#22C55E" : "#C7C7C7"}
              />
              <Text
                style={[
                  styles.bottomBarText,
                  isActive && styles.bottomBarTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
