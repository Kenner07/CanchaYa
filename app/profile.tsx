import { getApiBaseUrl, readSessionUser, saveSessionUser } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const sessionUser = await readSessionUser();
        setUser(sessionUser || {});
      } catch (error) {
        console.warn("No se pudo cargar el perfil:", error);
      }
    };

    loadUser();
  }, []);

  const roleLabel =
    String(user.role || "deportista")
      .replace(/_/g, " ")
      .replace(/^./, (c) => c.toUpperCase()) || "Deportista";

  const pickAndUploadPhoto = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permiso requerido",
          "Activa el acceso a fotos para cambiar tu foto de perfil.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const formData = new FormData();
      formData.append("userId", String(user.id || 0));
      formData.append("photo", {
        uri: asset.uri,
        name: asset.fileName || "profile.jpg",
        type: asset.mimeType || "image/jpeg",
      } as any);

      setUploading(true);
      const response = await fetch(
        `${getApiBaseUrl()}/api/profile/upload-photo`,
        {
          method: "POST",
          body: formData,
        },
      );
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "No se pudo actualizar la foto.");
      }

      const updatedUser = { ...user, foto_perfil: data.imageUrl };
      setUser(updatedUser);
      await saveSessionUser(updatedUser);
      Alert.alert("Éxito", "Tu foto de perfil se actualizó correctamente.");
    } catch (error) {
      console.warn("Error al subir foto:", error);
      Alert.alert("Error", "No se pudo cambiar la foto de perfil.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#16A34A" />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>Mi perfil</Text>
            <Text style={styles.title}>Tu espacio personal</Text>
          </View>
        </View>

        <View style={styles.cardPrimary}>
          {user.foto_perfil ? (
            <Image
              source={{ uri: user.foto_perfil }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={30} color="#22C55E" />
            </View>
          )}
          <Text style={styles.userName}>
            {user.name || user.email || "Jugador"}
          </Text>
          <Text style={styles.userRole}>{roleLabel}</Text>
          <Text style={styles.userMeta}>
            {user.email || "Correo no disponible"}
          </Text>

          <Pressable
            style={styles.uploadButton}
            onPress={pickAndUploadPhoto}
            disabled={uploading}
          >
            <Ionicons name="cloud-upload-outline" size={18} color="#F9FAFB" />
            <Text style={styles.uploadButtonText}>
              {uploading ? "Subiendo..." : "Cambiar foto de perfil"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.grid}>
          <View style={styles.infoCard}>
            <Ionicons name="mail-outline" size={18} color="#86EFAC" />
            <Text style={styles.infoLabel}>Correo</Text>
            <Text style={styles.infoValue}>{user.email || "—"}</Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="id-card-outline" size={18} color="#86EFAC" />
            <Text style={styles.infoLabel}>Rol</Text>
            <Text style={styles.infoValue}>{roleLabel}</Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="calendar-outline" size={18} color="#86EFAC" />
            <Text style={styles.infoLabel}>Estado</Text>
            <Text style={styles.infoValue}>Activo</Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="location-outline" size={18} color="#86EFAC" />
            <Text style={styles.infoLabel}>Ciudad</Text>
            <Text style={styles.infoValue}>Cartagena</Text>
          </View>
        </View>

        <View style={styles.cardSecondary}>
          <Text style={styles.sectionTitle}>Resumen</Text>
          <Text style={styles.sectionText}>
            Desde aquí puedes ver tu cuenta y mantener el flujo de reservas y
            favoritos alineado con el resto del menú.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#171717",
  },
  content: {
    padding: 18,
    paddingBottom: 36,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
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
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: "#86EFAC",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  title: {
    color: "#F9FAFB",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 2,
  },
  cardPrimary: {
    backgroundColor: "#232323",
    borderRadius: 24,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 16,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(34, 197, 94, 0.14)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "rgba(34, 197, 94, 0.4)",
  },
  userName: {
    color: "#F9FAFB",
    fontSize: 20,
    fontWeight: "800",
  },
  userRole: {
    color: "#86EFAC",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
    textTransform: "capitalize",
  },
  userMeta: {
    color: "#C7C7C7",
    fontSize: 13,
    marginTop: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  infoCard: {
    width: "48%",
    backgroundColor: "#232323",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    minHeight: 96,
  },
  infoLabel: {
    color: "#C7C7C7",
    fontSize: 12,
    marginTop: 4,
  },
  infoValue: {
    color: "#F9FAFB",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#22C55E",
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  uploadButtonText: {
    color: "#F9FAFB",
    fontSize: 14,
    fontWeight: "800",
  },
  cardSecondary: {
    backgroundColor: "#232323",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginTop: 16,
  },
  sectionTitle: {
    color: "#F9FAFB",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  sectionText: {
    color: "#C7C7C7",
    fontSize: 13,
    lineHeight: 18,
  },
});
