import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  ImageBackground,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

const suggestedFields = [
  {
    id: "porvenir",
    name: "Cancha El Porvenir",
    rating: "4.7",
    distance: "1.2 km",
    status: "Available Now",
    image: require("@/assets/images/fondo.png"),
  },
  {
    id: "juvenil",
    name: "Estadio Juvenil",
    rating: "4.7",
    distance: "1.2 km",
    status: "Available Now",
    image: require("@/assets/images/ss.png"),
  },
  {
    id: "arena",
    name: "Cancha Arena FC",
    rating: "4.6",
    distance: "1.4 km",
    status: "Available Now",
    image: require("@/assets/images/fondo.png"),
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const [name, setName] = useState("Jugador");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const registrationFilePath =
          FileSystem.documentDirectory + "registration_data.json";
        const savedData = await FileSystem.readAsStringAsync(
          registrationFilePath,
          {
            encoding: FileSystem.EncodingType.UTF8,
          },
        );
        const parsed = JSON.parse(savedData);
        setName(parsed.name || parsed.username || "Jugador");
      } catch {
        setName("Jugador");
      }
    };
    loadUser();
  }, []);

  const handleLogout = async () => {
    try {
      const registrationFilePath =
        FileSystem.documentDirectory + "registration_data.json";
      await FileSystem.deleteAsync(registrationFilePath);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
    router.replace("/login");
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
            <View style={styles.pinRow}>
              <Ionicons
                name="location-sharp"
                size={28}
                color="#FFD700"
                style={styles.pin1}
              />
              <Ionicons
                name="location-sharp"
                size={28}
                color="#FFD700"
                style={styles.pin2}
              />
              <Ionicons
                name="location-sharp"
                size={28}
                color="#FFD700"
                style={styles.pin3}
              />
            </View>
            <Text style={styles.mapPlaceholderText}>Google Maps</Text>
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
                <Pressable style={styles.detailButton}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(76, 175, 80, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  brandText: {
    color: "#FFD700",
    fontSize: 24,
    fontWeight: "800",
  },
  greeting: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  heading: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 32,
  },
  topIcons: {
    flexDirection: "row",
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  mapCard: {
    borderRadius: 20,
    backgroundColor: "#111",
    padding: 16,
    marginBottom: 28,
  },
  mapHeader: {
    marginBottom: 14,
  },
  mapLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  mapSubLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginTop: 4,
  },
  mapPlaceholder: {
    height: 200,
    borderRadius: 18,
    backgroundColor: "#101010",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  mapPlaceholderText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    position: "absolute",
    bottom: 16,
  },
  pinRow: {
    width: "100%",
    height: "100%",
  },
  pin1: {
    position: "absolute",
    top: "26%",
    left: "42%",
  },
  pin2: {
    position: "absolute",
    top: "45%",
    left: "28%",
  },
  pin3: {
    position: "absolute",
    top: "60%",
    left: "60%",
  },
  sectionHeader: {
    marginBottom: 18,
    marginTop: 8,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  cardList: {
    paddingVertical: 8,
  },
  card: {
    width: width * 0.72,
    marginRight: 12,
    borderRadius: 16,
    backgroundColor: "#0d0d0d",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cardImage: {
    width: "100%",
    height: 120,
    justifyContent: "flex-end",
  },
  cardImageInner: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  cardBadge: {
    alignSelf: "flex-start",
    margin: 12,
    backgroundColor: "rgba(76, 175, 80, 0.95)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  cardBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  cardContent: {
    padding: 14,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardRating: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 6,
  },
  cardDistance: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "500",
  },
  detailButton: {
    backgroundColor: "#FFD700",
    borderRadius: 18,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  detailButtonText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "800",
  },
  avatarContainer: {
    position: "relative",
  },
  dropdownMenu: {
    position: "absolute",
    top: 50,
    right: 0,
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  menuItemText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 4,
  },
});
