import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { readSessionUser } from "@/utils/api";

const WELCOME_SEEN_KEY = "welcome_seen";

export default function WelcomeScreen() {
  const router = useRouter();

  const handleBegin = async () => {
    try {
      await AsyncStorage.setItem(WELCOME_SEEN_KEY, "true");
      const sessionUser = await readSessionUser();

      if (sessionUser?.id) {
        router.replace("/");
      } else {
        router.replace("/login");
      }
    } catch (error) {
      console.warn("No se pudo iniciar el flujo de bienvenida:", error);
      router.replace("/login");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require("@/assets/images/fondo.png")}
        style={styles.backgroundImage}
        blurRadius={18}
      >
        <View style={styles.darkOverlay} />
        <View style={styles.content}>
          <View style={styles.header}>
            <Image
              source={require("@/assets/images/Logo.png")}
              style={styles.brandLogo}
              contentFit="contain"
            />
          </View>

          <View style={styles.messageContainer}>
            <Text style={styles.title}>¡Bienvenido!</Text>
            <Text style={styles.subtitle}>
              Empieza a buscar tu cancha cercana
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.loginButton,
              pressed && styles.loginButtonPressed,
            ]}
            onPress={handleBegin}
          >
            <Text style={styles.loginButtonText}>Empezar</Text>
          </Pressable>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1F1F1F",
  },
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    backgroundColor: "#1F1F1F",
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(31, 31, 31, 0.88)",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    zIndex: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  brandLogo: {
    width: 130,
    height: 36,
  },
  messageContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    color: "#F9FAFB",
    fontSize: 42,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    color: "#C7C7C7",
    fontSize: 20,
    textAlign: "center",
    lineHeight: 28,
    opacity: 0.9,
  },
  loginButton: {
    backgroundColor: "#22C55E",
    paddingVertical: 18,
    borderRadius: 32,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  loginButtonPressed: {
    backgroundColor: "#16A34A",
    transform: [{ scale: 0.98 }],
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
});
