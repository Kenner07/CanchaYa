import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ImageBackground,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { styles } from "./home.styles";

export default function HomeScreen() {
  const router = useRouter();
  const [name, setName] = useState("Jugador");
  const [menuOpen, setMenuOpen] = useState(false);
  const [suggestedFields, setSuggestedFields] = useState([
    {
      id: "la-favela",
      name: "La Favela",
      rating: "4.5",
      distance: "1.2 km",
      status: "Disponible ahora",
      image: require("@/assets/images/fondo.png"),
      latitude: 10.39988,
      longitude: -75.48149,
    },
    {
      id: "la-canchita",
      name: "La canchita",
      rating: "3.5",
      distance: "1.0 km",
      status: "Disponible ahora",
      image: require("@/assets/images/ss.png"),
      latitude: 10.40207,
      longitude: -75.48227,
    },
  ]);

  const getApiBaseUrl = () => {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as unknown as { manifest?: { debuggerHost?: string } })
        .manifest?.debuggerHost;

    if (Platform.OS === "android") {
      return "http://10.0.2.2:3001";
    }

    if (hostUri) {
      return `http://${hostUri.split(":")[0]}:3001`;
    }

    return "http://localhost:3001";
  };

  const API_URL = getApiBaseUrl();

  useEffect(() => {
    const loadCanchas = async () => {
      try {
        const response = await fetch(`${API_URL}/api/canchas`);
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
              image: require("@/assets/images/fondo.png"),
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
      }
    };

    loadCanchas();
  }, [API_URL]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const sessionFilePath = FileSystem.documentDirectory + "auth_user.json";
        const savedUser = await FileSystem.readAsStringAsync(sessionFilePath, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const parsed = JSON.parse(savedUser);
        setName(parsed.name || parsed.email || "Jugador");
      } catch (error) {
        console.warn("No se pudo leer la sesión guardada:", error);
        setName("Jugador");
      }
    };

    loadUser();
  }, []);

  const handleLogout = async () => {
    try {
      const sessionFilePath = FileSystem.documentDirectory + "auth_user.json";
      await FileSystem.deleteAsync(sessionFilePath);
    } catch (error) {
      console.warn("No se pudo limpiar la sesión:", error);
    } finally {
      router.replace("/login");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <View>
            <View style={styles.brandRow}>
              <View style={styles.brandIcon}>
                <Ionicons name="football-outline" size={20} color="#4CAF50" />
              </View>
              <Text style={styles.brandText}>CanchaYa</Text>
            </View>
            <Text style={styles.greeting}>¡Hola, {name}!</Text>
            <Text style={styles.heading}>Busca tu Cancha Cercana</Text>
          </View>

          <View style={styles.topIcons}>
            <View style={styles.avatarContainer}>
              <Pressable
                style={styles.avatar}
                onPress={() => setMenuOpen(!menuOpen)}
              >
                <Ionicons name="person-outline" size={20} color="#fff" />
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
                      color="#FFD700"
                    />
                    <Text style={styles.menuItemText}>Perfil</Text>
                  </Pressable>
                  <View style={styles.menuDivider} />
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
            <Pressable style={styles.searchButton}>
              <Ionicons name="search" size={22} color="#fff" />
            </Pressable>
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
                    <Ionicons name="star" size={14} color="#FFD700" />
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
