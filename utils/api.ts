import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

export const API_PORT = 3001;
export const SESSION_FILE_NAME = "auth_user.json";

export const getApiBaseUrl = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as unknown as { manifest?: { debuggerHost?: string } }).manifest
      ?.debuggerHost ||
    "";

  const normalizedHost = hostUri
    .replace(/^https?:\/\//i, "")
    .replace(/^exp:\/\//i, "")
    .split(":")[0]
    .trim();

  if (normalizedHost) {
    return `http://${normalizedHost}:${API_PORT}`;
  }

  if (Platform.OS === "android") {
    return `http://10.0.2.2:${API_PORT}`;
  }

  return `http://localhost:${API_PORT}`;
};

export const getSessionFilePath = () =>
  `${FileSystem.documentDirectory}${SESSION_FILE_NAME}`;

export const readSessionUser = async () => {
  const sessionFilePath = getSessionFilePath();
  const fileInfo = await FileSystem.getInfoAsync(sessionFilePath);

  if (!fileInfo.exists || !fileInfo.isDirectory) {
    return null;
  }

  const savedUser = await FileSystem.readAsStringAsync(sessionFilePath, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return JSON.parse(savedUser);
};

export const clearSession = async () => {
  try {
    await FileSystem.deleteAsync(getSessionFilePath(), { idempotent: true });
  } catch (error) {
    console.warn("No se pudo limpiar la sesión:", error);
    throw error;
  }
};
