import { getApiBaseUrl, getSessionFilePath } from "@/utils/api";
import { registerPushNotifications } from "@/utils/push";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { ImageBackground } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    Image,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  const API_URL = getApiBaseUrl();

  const handleCreateAccount = () => {
    router.push("/register");
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(
        "Campos incompletos",
        "Por favor ingresa tu correo y contraseña para continuar.",
      );
      return;
    }

    try {
      const response = await fetchWithTimeout(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Credenciales inválidas.");
      }

      const sessionFilePath = getSessionFilePath();
      await FileSystem.writeAsStringAsync(
        sessionFilePath,
        JSON.stringify(data.user),
        {
          encoding: FileSystem.EncodingType.UTF8,
        },
      );

      await registerPushNotifications(data.user);

      Alert.alert("Bienvenido", data.message || "Inicio de sesión correcto.", [
        { text: "OK", onPress: () => router.replace("/") },
      ]);
    } catch (error) {
      console.error(error);

      const message = error instanceof Error ? error.message.toLowerCase() : "";
      const isAbortError =
        (error as { name?: string } | null)?.name === "AbortError";

      if (
        (error instanceof TypeError &&
          (message.includes("network request failed") ||
            message.includes("timed out") ||
            message.includes("aborted"))) ||
        isAbortError
      ) {
        Alert.alert(
          "No se pudo conectar",
          "Verifica que la API esté corriendo en el puerto 3001 y que tu dispositivo pueda alcanzarla.",
        );
        return;
      }

      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "No se pudo iniciar sesión.",
      );
    }
  };

  const handleShowSavedData = () => {
    Alert.alert(
      "Información",
      "Ahora la validación se realiza contra la base de datos. Puedes usar tu correo y contraseña registrados.",
      [{ text: "OK" }],
    );
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
            <View style={styles.brandRow}>
              <Image
                source={require("@/assets/images/Logo.png")}
                style={styles.brandLogo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Inicia Sesión</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#16A34A"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Correo electrónico"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#16A34A"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                textContentType="password"
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.loginButton,
                pressed && styles.loginButtonPressed,
              ]}
              onPress={handleLogin}
            >
              <Text style={styles.loginButtonText}>Ingresar</Text>
            </Pressable>

            <View style={styles.actionRow}>
              <Pressable onPress={handleShowSavedData}>
                <Text style={styles.actionText}>Ver datos guardados</Text>
              </Pressable>
              <Pressable onPress={handleCreateAccount}>
                <Text style={styles.actionText}>Crear cuenta</Text>
              </Pressable>
            </View>
          </View>
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
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(34,197,94,0.14)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  brandLogo: {
    width: 130,
    height: 36,
  },
  brandText: {
    color: "#16A34A",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  title: {
    color: "#F9FAFB",
    fontSize: 42,
    fontWeight: "900",
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#3A3A3A",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 18,
    backgroundColor: "#2A2A2A",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: "#F9FAFB",
    fontSize: 16,
    fontWeight: "500",
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
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  actionText: {
    color: "#16A34A",
    fontSize: 14,
    fontWeight: "600",
  },
});
