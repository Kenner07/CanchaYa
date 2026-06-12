import { getApiBaseUrl } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
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

const documentOptions = [
  "Cédula de ciudadanía",
  "Pasaporte",
  "Documento de identidad",
  "Cédula de extranjero",
];

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
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
  const [username, setUsername] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [documentOpen, setDocumentOpen] = useState(false);
  const [documentNumber, setDocumentNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const API_URL = getApiBaseUrl();

  const handleSignIn = () => {
    router.push("/login");
  };

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Error", "Las contraseñas no coinciden.");
      return;
    }

    try {
      const response = await fetchWithTimeout(`${API_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          documentNumber,
          email,
          phone,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "No se pudo registrar el usuario.");
      }

      Alert.alert(
        "Registrado",
        data.message || "Usuario registrado correctamente.",
        [{ text: "OK", onPress: () => router.push("/login") }],
      );
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
        error instanceof Error
          ? error.message
          : "No se pudo guardar el registro.",
      );
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
            <View style={styles.brandRow}>
              <Image
                source={require("@/assets/images/Logo.png")}
                style={styles.brandLogo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Crear cuenta</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-outline"
                size={20}
                color="#16A34A"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Nombre completo"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-circle-outline"
                size={20}
                color="#16A34A"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Nombre de usuario"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color="#16A34A"
                style={styles.inputIcon}
              />
              <Pressable
                style={styles.selectWrapper}
                onPress={() => setDocumentOpen(!documentOpen)}
              >
                <Text
                  style={documentType ? styles.input : styles.selectPlaceholder}
                >
                  {documentType || "Tipo de documento"}
                </Text>
                <Ionicons name="chevron-down-outline" size={20} color="#16A34A" />
              </Pressable>
            </View>
            {documentOpen && (
              <View style={styles.optionList}>
                {documentOptions.map((option) => (
                  <Pressable
                    key={option}
                    style={styles.optionItem}
                    onPress={() => {
                      setDocumentType(option);
                      setDocumentOpen(false);
                    }}
                  >
                    <Text style={styles.optionText}>{option}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={styles.inputWrapper}>
              <Ionicons
                name="finger-print-outline"
                size={20}
                color="#16A34A"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Número de documento"
                placeholderTextColor="#9CA3AF"
                keyboardType="default"
                autoCapitalize="none"
                value={documentNumber}
                onChangeText={setDocumentNumber}
              />
            </View>

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
                name="call-outline"
                size={20}
                color="#16A34A"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Número de teléfono"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoCapitalize="none"
                value={phone}
                onChangeText={setPhone}
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
                textContentType="newPassword"
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
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
                placeholder="Confirmar contraseña"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                textContentType="newPassword"
                autoCapitalize="none"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.loginButton,
                pressed && styles.loginButtonPressed,
              ]}
              onPress={handleRegister}
            >
              <Text style={styles.loginButtonText}>Registrarse</Text>
            </Pressable>

            <View style={styles.actionRow}>
              <Pressable onPress={handleSignIn}>
                <Text style={styles.actionText}>¿Ya tienes cuenta?</Text>
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
  brandLogo: {
    width: 130,
    height: 36,
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
  selectWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectPlaceholder: {
    flex: 1,
    color: "#A3A3A3",
    fontSize: 16,
    fontWeight: "500",
  },
  optionList: {
    backgroundColor: "#2A2A2A",
    borderWidth: 1,
    borderColor: "#3A3A3A",
    borderRadius: 18,
    marginBottom: 18,
    overflow: "hidden",
  },
  optionItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionText: {
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
    justifyContent: "center",
    width: "100%",
  },
  actionText: {
    color: "#16A34A",
    fontSize: 14,
    fontWeight: "600",
  },
});
