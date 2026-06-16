import { getApiBaseUrl, resolveImageUrl } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

export default function MapSearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMap, setExpandedMap] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState<null | {
    latitude: number;
    longitude: number;
  }>(null);
  const [userLocation, setUserLocation] = useState<null | {
    latitude: number;
    longitude: number;
  }>(null);
  const [priceLimit, setPriceLimit] = useState(250000);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [grassType, setGrassType] = useState("all");
  const [distanceLimit, setDistanceLimit] = useState("all");
  const [mapRegion, setMapRegion] = useState({
    latitude: 10.3997,
    longitude: -75.5144,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const API_URL = getApiBaseUrl();

  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          setUserLocation({ latitude: 10.3997, longitude: -75.5144 });
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setUserLocation({ latitude: 10.3997, longitude: -75.5144 });
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
        setUserLocation({ latitude: 10.3997, longitude: -75.5144 });
      }
    };

    getUserLocation();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`${API_URL}/api/canchas`);
        const data = await response.json();

        if (response.ok && Array.isArray(data.canchas)) {
          const grouped = new Map<string, any>();

          data.canchas.forEach((field: any) => {
            const complexId = String(field.id_complejo ?? field.id_cancha);

            if (!grouped.has(complexId)) {
              grouped.set(complexId, {
                id: String(field.id_cancha),
                id_complejo: complexId,
                name: field.nombre_complejo || field.nombre_cancha,
                address: field.direccion_cancha || null,
                latitude: Number(field.latitud),
                longitude: Number(field.longitud),
                imageUrl: field.imagen_url || null,
                precio: getNumericValue(field.precio),
                representativeField: field,
                canchas: [field],
              });
              return;
            }

            grouped.get(complexId).canchas.push(field);
          });

          setFields(Array.from(grouped.values()));
        }
      } catch (error) {
        console.warn("No se pudieron cargar las canchas para el mapa:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [API_URL]);

  const getDistanceKm = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const normalizeText = (value: string) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const getNumericValue = (value: unknown) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  };

  const filteredFields = useMemo(() => {
    const query = normalizeText(searchQuery.trim());
    const referenceLocation = searchedLocation || userLocation || null;

    return fields.filter((field) => {
      const price = getNumericValue(
        field.representativeField?.precio ?? field.precio ?? 0,
      );
      const canchaType = String(
        field.representativeField?.tipo_cancha || field.tipo_cancha || "",
      );
      const surface = String(
        field.representativeField?.superficie || field.superficie || "",
      );
      const services = Array.from(
        new Set(
          (field.canchas || [field.representativeField || field])
            .flatMap((item: any) =>
              String(item?.servicios || item?.descripcion_complejo || "")
                .toLowerCase()
                .split(/[,/]+/)
                .map((entry) => normalizeText(entry.trim()))
                .filter(Boolean),
            )
            .filter(Boolean),
        ),
      );

      const textMatches =
        [
          field.name,
          field.address,
          field.representativeField?.nombre_cancha,
        ].some((value) => normalizeText(String(value || "")).includes(query)) ||
        (field.canchas || [])
          .map((item: any) => item?.nombre_cancha || "")
          .some((value) => normalizeText(String(value)).includes(query));

      const matchesQuery =
        !query ||
        textMatches ||
        searchedLocation !== null ||
        distanceLimit === "all";

      const matchesPrice = price <= priceLimit;

      const matchesSport =
        selectedSports.length === 0 ||
        selectedSports.some((sport) =>
          normalizeText(canchaType).includes(normalizeText(sport)),
        );

      const matchesServices =
        selectedServices.length === 0 ||
        selectedServices.every((service) =>
          services.includes(normalizeText(service)),
        );

      const matchesGrass =
        grassType === "all" ||
        (grassType === "sintetica" &&
          normalizeText(surface).includes("sintet")) ||
        (grassType === "natural" && normalizeText(surface).includes("natural"));

      const matchesDistance = (() => {
        if (!referenceLocation) return true;

        const limit = searchedLocation ? 2 : Number(distanceLimit || 0);
        if (!Number.isFinite(limit) || limit <= 0) return true;

        const latitude = Number(field.latitude);
        const longitude = Number(field.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          return true;
        }

        const distanceKm = getDistanceKm(
          referenceLocation.latitude,
          referenceLocation.longitude,
          latitude,
          longitude,
        );

        return distanceKm <= limit;
      })();

      return (
        matchesQuery &&
        matchesPrice &&
        matchesSport &&
        matchesServices &&
        matchesGrass &&
        matchesDistance
      );
    });
  }, [
    distanceLimit,
    fields,
    grassType,
    priceLimit,
    searchQuery,
    searchedLocation,
    selectedServices,
    selectedSports,
    userLocation,
  ]);

  const handleSearchLocation = async () => {
    const query = searchQuery.trim();

    if (!query) {
      setSearchedLocation(null);
      setDistanceLimit("all");
      setMapRegion({
        latitude: fields[0]?.latitude || 10.3997,
        longitude: fields[0]?.longitude || -75.5144,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      return;
    }

    try {
      const fetchJson = async (url: string) => {
        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
            "Accept-Language": "es",
            "User-Agent": "CanchaYa/1.0 (+https://canchaya.app)",
          },
        });

        const rawText = await response.text();

        if (!response.ok) {
          throw new Error(
            rawText || `Geocoding failed with status ${response.status}`,
          );
        }

        return JSON.parse(rawText);
      };

      const geocodeAttempts = [
        {
          label: "cerca",
          bbox: "-76.10,10.85,-74.95,9.95",
          query: `${query} Cartagena Bolivar`,
        },
        {
          label: "ampliado",
          bbox: "-76.80,11.25,-74.45,9.35",
          query: `${query} Bolívar`,
        },
      ];

      for (const attempt of geocodeAttempts) {
        const data = await fetchJson(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&countrycodes=co&bounded=1&viewbox=${attempt.bbox}&accept-language=es&q=${encodeURIComponent(attempt.query)}`,
        );

        if (Array.isArray(data) && data[0]) {
          const result = data[0];
          const latitude = Number(result.lat);
          const longitude = Number(result.lon);

          setSearchedLocation({ latitude, longitude });
          setDistanceLimit("2");
          setMapRegion({
            latitude,
            longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
          return;
        }
      }

      const fallbackData = await fetchJson(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&countrycodes=co&accept-language=es&q=${encodeURIComponent(`${query} Cartagena Bolivar`)}`,
      );

      if (Array.isArray(fallbackData) && fallbackData[0]) {
        const result = fallbackData[0];
        const latitude = Number(result.lat);
        const longitude = Number(result.lon);

        setSearchedLocation({ latitude, longitude });
        setDistanceLimit("2");
        setMapRegion({
          latitude,
          longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      } else {
        setSearchedLocation(null);
      }
    } catch (error) {
      console.warn("No se pudo geolocalizar el barrio buscado:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#16A34A" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Mapa</Text>
          <Text style={styles.title}>Busca y explora canchas cercanas</Text>
        </View>
      </View>

      <View style={styles.searchBoxContainer}>
        <Ionicons name="search" size={18} color="#86EFAC" />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Busca por nombre o barrio"
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
          returnKeyType="search"
          onSubmitEditing={handleSearchLocation}
        />
      </View>

      <Pressable
        onPress={() => setShowFilters((prev) => !prev)}
        style={[
          styles.filterToggleButton,
          showFilters && styles.filterToggleButtonActive,
        ]}
      >
        <Text style={styles.filterToggleText}>Agregar filtros</Text>
        <Ionicons
          name={showFilters ? "chevron-up" : "chevron-down"}
          size={16}
          color={showFilters ? "#ECFDF5" : "#86EFAC"}
        />
      </Pressable>

      {showFilters && (
        <View style={styles.filterPanel}>
          <Text style={styles.filterTitle}>Filtros</Text>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Precio</Text>
            <Text style={styles.filterHint}>
              Hasta COP {priceLimit.toLocaleString("es-CO")}
            </Text>
            <Slider
              minimumValue={50000}
              maximumValue={500000}
              step={50000}
              value={priceLimit}
              onValueChange={setPriceLimit}
              minimumTrackTintColor="#22C55E"
              maximumTrackTintColor="#374151"
              thumbTintColor="#ECFDF5"
            />
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Tamaño</Text>
            <View style={styles.filterRow}>
              {[
                "Futbol 5",
                "Futbol 7",
                "Futbol 8",
                "Futbol 9",
                "Futbol 11",
              ].map((sport) => {
                const active = selectedSports.includes(sport);
                return (
                  <Pressable
                    key={sport}
                    style={[
                      styles.filterChip,
                      active && styles.filterChipActive,
                    ]}
                    onPress={() =>
                      setSelectedSports((prev) =>
                        active
                          ? prev.filter((item) => item !== sport)
                          : [...prev, sport],
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        active && styles.filterChipTextActive,
                      ]}
                    >
                      {sport}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Servicios</Text>
            <View style={styles.filterRow}>
              {[
                "parqueadero",
                "vestidores",
                "baños",
                "cafeteria",
                "tienda",
              ].map((service) => {
                const active = selectedServices.includes(service);
                return (
                  <Pressable
                    key={service}
                    style={[
                      styles.filterChip,
                      active && styles.filterChipActive,
                    ]}
                    onPress={() =>
                      setSelectedServices((prev) =>
                        active
                          ? prev.filter((item) => item !== service)
                          : [...prev, service],
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        active && styles.filterChipTextActive,
                      ]}
                    >
                      {service}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Grama</Text>
            <View style={styles.filterRow}>
              {["all", "sintetica", "natural"].map((option) => (
                <Pressable
                  key={option}
                  style={[
                    styles.filterChip,
                    grassType === option && styles.filterChipActive,
                  ]}
                  onPress={() => setGrassType(option)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      grassType === option && styles.filterChipTextActive,
                    ]}
                  >
                    {option === "all"
                      ? "Toda la grama"
                      : option === "sintetica"
                        ? "Sintética"
                        : "Natural"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Cerca de mí</Text>
            <View style={styles.filterRow}>
              {["all", "1", "3", "5"].map((option) => (
                <Pressable
                  key={option}
                  style={[
                    styles.filterChip,
                    distanceLimit === option && styles.filterChipActive,
                  ]}
                  onPress={() => setDistanceLimit(option)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      distanceLimit === option && styles.filterChipTextActive,
                    ]}
                  >
                    {option === "all"
                      ? "Cualquier distancia"
                      : `Menos de ${option} km`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      )}

      <Pressable style={styles.mapCard} onPress={() => setExpandedMap(true)}>
        <View style={styles.mapBadgeRow}>
          <Text style={styles.mapBadgeText}>Toca para ampliar</Text>
          <Ionicons name="expand" size={16} color="#86EFAC" />
        </View>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#22C55E" />
            <Text style={styles.loadingText}>Cargando mapa…</Text>
          </View>
        ) : (
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={mapRegion}
            region={mapRegion}
            showsUserLocation
            showsMyLocationButton={false}
          >
            {filteredFields.map((field) => (
              <Marker
                key={field.id}
                coordinate={{
                  latitude: Number(field.latitude),
                  longitude: Number(field.longitude),
                }}
                title={field.name}
                description={field.address || "Cancha cercana"}
              />
            ))}
          </MapView>
        )}
      </Pressable>

      <Modal
        visible={expandedMap}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setExpandedMap(false)}
      >
        <SafeAreaView style={styles.expandedContainer}>
          <View style={[styles.expandedHeader, { paddingTop: insets.top + 6 }]}>
            <View style={styles.expandedTitleBox}>
              <Text style={styles.eyebrow}>Vista ampliada</Text>
              <Text style={styles.expandedTitle}>
                Busca mejor sobre el mapa
              </Text>
            </View>
          </View>

          <View style={styles.searchBoxContainerExpanded}>
            <Ionicons name="search" size={18} color="#86EFAC" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Busca por nombre o barrio"
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={handleSearchLocation}
            />
          </View>

          <View style={styles.expandedMapCard}>
            <Pressable
              onPress={() => setExpandedMap(false)}
              style={styles.expandedCloseFab}
            >
              <Ionicons name="close" size={18} color="#F9FAFB" />
              <Text style={styles.expandedCloseFabText}>Cerrar</Text>
            </Pressable>
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color="#22C55E" />
                <Text style={styles.loadingText}>Cargando mapa…</Text>
              </View>
            ) : (
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.expandedMap}
                initialRegion={mapRegion}
                region={mapRegion}
                showsUserLocation
                showsMyLocationButton={false}
              >
                {filteredFields.map((field) => (
                  <Marker
                    key={field.id}
                    coordinate={{
                      latitude: Number(field.latitude),
                      longitude: Number(field.longitude),
                    }}
                    title={field.name}
                    description={field.address || "Cancha cercana"}
                  />
                ))}
              </MapView>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      <ScrollView contentContainerStyle={styles.listContent}>
        {filteredFields.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              No hay canchas para esta búsqueda.
            </Text>
          </View>
        ) : (
          filteredFields.map((field) => (
            <Pressable
              key={field.id}
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: "/cancha-details",
                  params: {
                    id: String(
                      field.representativeField?.id_cancha ?? field.id,
                    ),
                    id_complejo: String(
                      field.id_complejo ||
                        field.representativeField?.id_complejo ||
                        field.id,
                    ),
                    name: field.name,
                    rating: String(
                      field.representativeField?.valoracion ?? "0",
                    ),
                    address: field.address || "null",
                    distance: "1.2 km",
                    status: "Disponible ahora",
                    latitude: String(
                      field.representativeField?.latitud ??
                        field.latitude ??
                        "null",
                    ),
                    longitude: String(
                      field.representativeField?.longitud ??
                        field.longitude ??
                        "null",
                    ),
                    precio:
                      field.representativeField?.precio ??
                      field.precio ??
                      "null",
                    horario: "null",
                    superficie: field.representativeField?.superficie ?? "null",
                    capacidad: field.representativeField?.capacidad ?? "null",
                    imageUrl:
                      field.representativeField?.imagen_url ??
                      field.imageUrl ??
                      "null",
                  },
                })
              }
            >
              <Image
                source={
                  resolveImageUrl(field.imageUrl)
                    ? { uri: resolveImageUrl(field.imageUrl) as string }
                    : require("@/assets/images/fondo.png")
                }
                style={styles.cardImage}
              />
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{field.name}</Text>
                <Text style={styles.cardMeta}>
                  {field.address || "Sin dirección"}
                </Text>
                <Text style={styles.cardPrice}>
                  ${Number(field.precio || 0).toLocaleString("es-CO")}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#171717" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(76,175,80,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerText: { flex: 1 },
  eyebrow: {
    color: "#86EFAC",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: { color: "#F9FAFB", fontSize: 18, fontWeight: "800" },
  searchBoxContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#2A2A2A",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.22)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 14,
    marginTop: 8,
  },
  searchInput: { flex: 1, color: "#F9FAFB", fontSize: 14, fontWeight: "500" },
  filterToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 14,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#232323",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.18)",
  },
  filterToggleButtonActive: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderColor: "rgba(134,239,172,0.35)",
  },
  filterToggleText: {
    color: "#F9FAFB",
    fontSize: 12,
    fontWeight: "800",
  },
  filterPanel: {
    marginHorizontal: 14,
    marginTop: 8,
    padding: 10,
    backgroundColor: "#232323",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  filterTitle: {
    color: "#F9FAFB",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
  },
  filterSection: { marginBottom: 10 },
  filterSectionTitle: {
    color: "#BBF7D0",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 2,
  },
  filterHint: { color: "#D1D5DB", fontSize: 11, marginBottom: 4 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: {
    borderRadius: 999,
    backgroundColor: "#2A2A2A",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterChipActive: {
    backgroundColor: "rgba(34,197,94,0.16)",
    borderColor: "rgba(134,239,172,0.4)",
  },
  filterChipText: { color: "#D1D5DB", fontSize: 11, fontWeight: "700" },
  filterChipTextActive: { color: "#ECFDF5" },
  mapCard: {
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#2A2A2A",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    height: 280,
  },
  mapBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(34,197,94,0.08)",
  },
  mapBadgeText: { color: "#BBF7D0", fontSize: 12, fontWeight: "700" },
  map: { flex: 1 },
  expandedContainer: { flex: 1, backgroundColor: "#171717" },
  expandedHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  expandedTitleBox: { flex: 1 },
  expandedTitle: { color: "#F9FAFB", fontSize: 16, fontWeight: "800" },
  searchBoxContainerExpanded: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#2A2A2A",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.22)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 14,
    marginBottom: 10,
  },
  expandedMapCard: {
    flex: 1,
    marginHorizontal: 14,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#2A2A2A",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  expandedCloseFab: {
    position: "absolute",
    right: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    zIndex: 5,
    elevation: 5,
  },
  expandedCloseFabText: { color: "#F9FAFB", fontSize: 12, fontWeight: "700" },
  expandedMap: { flex: 1 },
  loadingBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#C7C7C7", marginTop: 8 },
  listContent: { padding: 14, paddingBottom: 28 },
  card: {
    flexDirection: "row",
    backgroundColor: "#252525",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 10,
  },
  cardImage: { width: 92, height: 92 },
  cardBody: { flex: 1, padding: 10, justifyContent: "center" },
  cardTitle: { color: "#F9FAFB", fontSize: 14, fontWeight: "800" },
  cardMeta: { color: "#C7C7C7", fontSize: 12, marginTop: 2 },
  cardPrice: {
    color: "#22C55E",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6,
  },
  emptyBox: { backgroundColor: "#2A2A2A", borderRadius: 14, padding: 14 },
  emptyText: { color: "#C7C7C7", textAlign: "center" },
});
