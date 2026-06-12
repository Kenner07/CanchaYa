import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

export const API_PORT = 3001;
export const SESSION_FILE_NAME = "auth_user.json";

export const getApiBaseUrl = () => {
  const manifestHost =
    (
      Constants as unknown as {
        manifest?: { debuggerHost?: string };
        manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } };
        expoConfig?: { hostUri?: string; debuggerHost?: string };
      }
    ).manifest?.debuggerHost ||
    (
      Constants as unknown as {
        manifest?: { debuggerHost?: string };
        manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } };
        expoConfig?: { hostUri?: string; debuggerHost?: string };
      }
    ).manifest2?.extra?.expoGo?.debuggerHost ||
    (
      Constants as unknown as {
        manifest?: { debuggerHost?: string };
        manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } };
        expoConfig?: { hostUri?: string; debuggerHost?: string };
      }
    ).expoConfig?.hostUri ||
    (
      Constants as unknown as {
        manifest?: { debuggerHost?: string };
        manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } };
        expoConfig?: { hostUri?: string; debuggerHost?: string };
      }
    ).expoConfig?.debuggerHost ||
    "";

  const normalizedHost = String(manifestHost || "")
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

  if (Platform.OS === "ios") {
    return `http://localhost:${API_PORT}`;
  }

  return `http://localhost:${API_PORT}`;
};

export const resolveImageUrl = (value?: string | null) => {
  if (!value) return null;

  if (/^https?:\/\//i.test(value)) return value;

  if (value.startsWith("data:")) return value;

  const baseUrl = getApiBaseUrl();
  return `${baseUrl}${value.startsWith("/") ? value : `/${value}`}`;
};

export const getApiBaseCandidates = () => {
  const primary = getApiBaseUrl();

  return Array.from(
    new Set([
      primary,
      `http://192.168.20.21:${API_PORT}`,
      `http://10.0.2.2:${API_PORT}`,
      `http://localhost:${API_PORT}`,
    ]),
  );
};

export const fetchJson = async (path: string, init?: RequestInit) => {
  const candidates = getApiBaseCandidates();

  let lastError: unknown;

  for (const baseUrl of candidates) {
    try {
      const response = await fetch(`${baseUrl}${path}`, init);
      const text = await response.text();

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${text || "Respuesta no válida del servidor"}`,
        );
      }

      const trimmed = text.trim();
      if (!trimmed) {
        throw new Error("La respuesta de la API está vacía.");
      }

      if (trimmed.startsWith("<")) {
        throw new Error("La respuesta de la API no está en formato JSON.");
      }

      return JSON.parse(trimmed);
    } catch (error) {
      lastError = error;
      continue;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("No se pudo cargar la respuesta de la API.");
};

export const getSessionFilePath = () =>
  `${FileSystem.documentDirectory}${SESSION_FILE_NAME}`;

export const readSessionUser = async () => {
  const sessionFilePath = getSessionFilePath();
  const fileInfo = await FileSystem.getInfoAsync(sessionFilePath);

  if (!fileInfo.exists) {
    return null;
  }

  const savedUser = await FileSystem.readAsStringAsync(sessionFilePath, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return JSON.parse(savedUser);
};

export const saveSessionUser = async (user: unknown) => {
  try {
    await FileSystem.writeAsStringAsync(
      getSessionFilePath(),
      JSON.stringify(user, null, 2),
      {
        encoding: FileSystem.EncodingType.UTF8,
      },
    );
  } catch (error) {
    console.warn("No se pudo guardar la sesión:", error);
    throw error;
  }
};

export const clearSession = async () => {
  try {
    await FileSystem.deleteAsync(getSessionFilePath(), { idempotent: true });
  } catch (error) {
    console.warn("No se pudo limpiar la sesión:", error);
    throw error;
  }
};
