import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import { ImageBackground } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Credenciales inválidas.");
      }

      const sessionFilePath = FileSystem.documentDirectory + "auth_user.json";
      await FileSystem.writeAsStringAsync(
        sessionFilePath,
        JSON.stringify(data.user),
        {
          encoding: FileSystem.EncodingType.UTF8,
        },
      );

      Alert.alert("Bienvenido", data.message || "Inicio de sesión correcto.", [
        { text: "OK", onPress: () => router.replace("/") },
      ]);
    } catch (error) {
      console.error(error);

      if (
        error instanceof TypeError &&
        error.message.includes("Network request failed")
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
                color="#fff"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Correo electrónico"
                placeholderTextColor="rgba(255,255,255,0.7)"
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
                color="#fff"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor="rgba(255,255,255,0.7)"
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
    backgroundColor: "#000",
  },
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
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
    backgroundColor: "rgba(168,255,79,0.18)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  brandLogo: {
    width: 130,
    height: 36,
  },
  brandText: {
    color: "#FFD700",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  title: {
    color: "#fff",
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
    borderColor: "rgba(255,255,255,0.85)",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  loginButton: {
    backgroundColor: "#FFD700",
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
    backgroundColor: "#F7C500",
    transform: [{ scale: 0.98 }],
  },
  loginButtonText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "800",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  actionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
