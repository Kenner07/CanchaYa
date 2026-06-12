import { getApiBaseUrl } from "@/utils/api";
import Constants from "expo-constants";

export async function registerPushNotifications(user: {
  id?: number | string;
  source?: string;
}) {
  if (Constants.appOwnership === "expo") {
    return null;
  }

  const projectId =
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId;

  if (!projectId) {
    console.warn(
      "No se registraron notificaciones push: falta configurar extra.eas.projectId en app.json.",
    );
    return null;
  }

  const Device = await import("expo-device");
  const Notifications = await import("expo-notifications");

  if (!Device.isDevice) {
    return null;
  }

  try {
    const existingPermission = (await Notifications.getPermissionsAsync()) as any;
    let granted = Boolean(
      existingPermission?.granted || existingPermission?.status === "granted",
    );

    if (!granted) {
      const requested = (await Notifications.requestPermissionsAsync()) as any;
      granted = Boolean(requested?.granted || requested?.status === "granted");
    }

    if (!granted) {
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    if (!token) {
      return null;
    }

    const apiUrl = getApiBaseUrl();

    await fetch(`${apiUrl}/api/notifications/register-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userType: user.source || "deportista",
        userId: user.id,
        token,
      }),
    });

    return token;
  } catch (error) {
    console.warn("No se pudo registrar el token de notificación:", error);
    return null;
  }
}
