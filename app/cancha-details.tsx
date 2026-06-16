import {
    getApiBaseCandidates,
    getApiBaseUrl,
    readSessionUser,
} from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

export const options = {
  headerShown: true,
};

export default function CanchaDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    id_complejo?: string;
    name?: string;
    rating?: string;
    address?: string;
    distance?: string;
    status?: string;
    latitude?: string;
    longitude?: string;
    precio?: string;
    horario?: string;
    superficie?: string;
    imageUrl?: string;
    fromAdmin?: string;
  }>();
  const [previewVisible, setPreviewVisible] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [availability, setAvailability] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [availabilityStatus, setAvailabilityStatus] = useState(
    params.status || "No disponible",
  );
  const [isFavorite, setIsFavorite] = useState(false);
  const [availableCourts, setAvailableCourts] = useState<any[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<any | null>(null);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [isAdminMode] = useState(Boolean(params.fromAdmin === "1"));
  const [complexName, setComplexName] = useState(params.name || "");
  const [complexAddress, setComplexAddress] = useState(
    params.address && params.address !== "null" ? String(params.address) : "",
  );
  const [complexDescription, setComplexDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState(params.imageUrl || "");
  const [selectedGalleryAsset, setSelectedGalleryAsset] = useState<any>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [servicesText, setServicesText] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [courtSchedules, setCourtSchedules] = useState<
    Record<
      number,
      Record<string, { open: string; close: string; enabled: boolean }>
    >
  >({});
  const [savingAdmin, setSavingAdmin] = useState(false);

  const latitude =
    params.latitude && params.latitude !== "null"
      ? Number(params.latitude)
      : null;
  const longitude =
    params.longitude && params.longitude !== "null"
      ? Number(params.longitude)
      : null;

  const API_URL = getApiBaseUrl();
  const serviceOptions = [
    "parqueadero",
    "vestidores",
    "baños",
    "cafeteria",
    "tienda",
  ];
  const weekDayLabels = {
    lunes: "Lunes",
    martes: "Martes",
    miercoles: "Miércoles",
    jueves: "Jueves",
    viernes: "Viernes",
    sabado: "Sábado",
    domingo: "Domingo",
  } as const;

  const weekDays = Object.keys(weekDayLabels) as (keyof typeof weekDayLabels)[];

  const normalizeDayKey = (value: string) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const defaultSchedule = {
    open: "08:00",
    close: "20:00",
    enabled: true,
  };

  const horarios =
    selectedCourt?.id_cancha && courtSchedules[Number(selectedCourt.id_cancha)]
      ? (weekDays
          .map((day) => {
            const entry =
              courtSchedules[Number(selectedCourt.id_cancha)]?.[
                normalizeDayKey(day)
              ];
            return entry?.enabled
              ? `${weekDayLabels[day]} - ${entry.open} a ${entry.close}`
              : null;
          })
          .filter(Boolean) as string[])
      : params.horario && params.horario !== "null"
        ? params.horario
            .split(";")
            .map((item) => item.trim())
            .filter(Boolean)
        : [];

  const formatPrice = (value?: string) => {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return "Precio no disponible";
    }

    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(numericValue);
  };

  const imageSource =
    (photoUrl || params.imageUrl) && (photoUrl || params.imageUrl) !== "null"
      ? { uri: String(photoUrl || params.imageUrl) }
      : require("@/assets/images/fondo.png");

  const canchaId = Number(params.id || 0);
  const complexId = Number(params.id_complejo || params.id || 0);

  const normalizeSchedule = useCallback((value?: string) => {
    const parsed = value
      ? value
          .split(";")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

    return parsed.reduce<
      Record<string, { open: string; close: string; enabled: boolean }>
    >((acc, item) => {
      const [day, timeRange] = item.split("-");
      const normalizedDay = normalizeDayKey(day);
      const range = String(timeRange || "").trim();
      const [openPart = "08:00", closePart = "20:00"] = range
        .split("a")
        .map((part) => part.trim());

      if (normalizedDay) {
        acc[normalizedDay] = {
          open: openPart,
          close: closePart,
          enabled: true,
        };
      }

      return acc;
    }, {});
  }, []);

  const normalizeScheduleMap = useCallback(
    (value?: string) => normalizeSchedule(value),
    [normalizeSchedule],
  );

  const updateCourtScheduleField = (
    courtId: number,
    day: string,
    field: "open" | "close",
    value: string,
  ) => {
    setCourtSchedules((prev) => ({
      ...prev,
      [courtId]: {
        ...(prev[courtId] || {}),
        [normalizeDayKey(day)]: {
          ...(prev[courtId]?.[normalizeDayKey(day)] || defaultSchedule),
          [field]: value,
        },
      },
    }));
  };

  const toggleCourtScheduleDay = (courtId: number, day: string) => {
    const normalizedDay = normalizeDayKey(day);

    setCourtSchedules((prev) => ({
      ...prev,
      [courtId]: {
        ...(prev[courtId] || {}),
        [normalizedDay]: {
          ...(prev[courtId]?.[normalizedDay] || defaultSchedule),
          enabled: !prev[courtId]?.[normalizedDay]?.enabled,
        },
      },
    }));
  };

  const buildSchedulePayload = (courtId: number) =>
    weekDays
      .map((day) => {
        const normalizedDay = normalizeDayKey(day);
        const entry =
          courtSchedules[Number(courtId)]?.[normalizedDay] || defaultSchedule;
        if (!entry.enabled) return null;

        return {
          dia_semana: normalizedDay,
          hora_apertura: entry.open,
          hora_cierre: entry.close,
        };
      })
      .filter(Boolean);

  const updateCourtField = (idCancha: number, field: string, value: string) => {
    setAvailableCourts((prev) =>
      prev.map((item) =>
        Number(item.id_cancha) === Number(idCancha)
          ? { ...item, [field]: value }
          : item,
      ),
    );
  };

  const addCourtDraft = () => {
    const draftId = Date.now() * -1;

    const draftCourt = {
      id_cancha: draftId,
      id_complejo: complexId || 0,
      nombre_cancha: "",
      tipo_cancha: "Futbol 5",
      precio: 0,
      superficie: "",
      estado: "Disponible",
    };

    setAvailableCourts((prev) => [...prev, draftCourt]);
    setSelectedCourt(draftCourt);
    setCourtSchedules((prev) => ({
      ...prev,
      [draftId]: Object.fromEntries(
        weekDays.map((day) => [day, { ...defaultSchedule, enabled: true }]),
      ),
    }));
  };

  const pickCourtPhoto = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permiso requerido",
          "Activa el acceso a fotos para elegir una imagen para la cancha.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"] as any,
        allowsEditing: true,
        quality: 0.9,
        aspect: [4, 3],
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      setSelectedGalleryAsset(asset);
      setPhotoUrl(asset.uri);
      Alert.alert(
        "Foto seleccionada",
        "La imagen quedó lista para guardarse con la cancha.",
      );
    } catch (error) {
      console.warn("Error al seleccionar foto de cancha:", error);
      Alert.alert("Error", "No se pudo abrir la galería de fotos.");
    }
  };

  const handleSaveAdminChanges = async () => {
    if (!complexId) return;

    try {
      setSavingAdmin(true);

      const complexResponse = await fetchJson(`/api/complejos/${complexId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_complejo: complexName || undefined,
          descripcion:
            `${complexDescription || ""} ${selectedServices.length ? `Servicios: ${selectedServices.join(", ")}` : servicesText || ""}`.trim(),
          direccion: complexAddress || undefined,
        }),
      });

      if (!complexResponse.response.ok || !complexResponse.data?.ok) {
        throw new Error(
          complexResponse.data?.message || "No se pudo actualizar el complejo.",
        );
      }

      const courtsToPersist = availableCourts.map((court) => ({ ...court }));

      await Promise.all(
        courtsToPersist.map(async (court) => {
          const isNewCourt = Number(court.id_cancha) < 0;

          if (isNewCourt) {
            const response = await fetchJson(`/api/canchas`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id_complejo: complexId,
                nombre_cancha: court.nombre_cancha || "Cancha nueva",
                tipo_cancha: court.tipo_cancha || "Futbol 5",
                precio: Number(court.precio || 0),
                superficie: court.superficie || undefined,
                estado: court.estado || "Disponible",
              }),
            });

            if (
              !response.response.ok ||
              !response.data?.ok ||
              !response.data?.cancha?.id_cancha
            ) {
              throw new Error(
                response.data?.message || "No se pudo crear una cancha.",
              );
            }

            court.id_cancha = Number(response.data.cancha.id_cancha);
            setAvailableCourts((prev) =>
              prev.map((item) =>
                Number(item.id_cancha) ===
                Number(response.data.cancha.id_cancha)
                  ? { ...item, ...response.data.cancha }
                  : item,
              ),
            );
            return;
          }

          const response = await fetchJson(`/api/canchas/${court.id_cancha}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nombre_cancha: court.nombre_cancha || undefined,
              tipo_cancha: court.tipo_cancha || undefined,
              precio: Number(court.precio || 0),
              superficie: court.superficie || undefined,
            }),
          });

          if (!response.response.ok || !response.data?.ok) {
            throw new Error(
              response.data?.message || "No se pudo actualizar una cancha.",
            );
          }
        }),
      );

      if (selectedGalleryAsset) {
        setUploadingPhoto(true);

        const candidates = getApiBaseCandidates();
        let lastError: unknown;

        for (const baseUrl of candidates) {
          try {
            await Promise.all(
              courtsToPersist.map(async (court) => {
                const formData = new FormData();
                formData.append("photo", {
                  uri: selectedGalleryAsset.uri,
                  name:
                    selectedGalleryAsset.fileName ||
                    `cancha-${court.id_cancha}.jpg`,
                  type: selectedGalleryAsset.mimeType || "image/jpeg",
                } as any);

                const response = await fetch(
                  `${baseUrl}/api/imagenes-cancha/${court.id_cancha}`,
                  {
                    method: "POST",
                    body: formData,
                  },
                );

                const text = await response.text();
                if (!response.ok || !text.trim().startsWith("{")) {
                  throw new Error("Respuesta inválida al subir la imagen.");
                }

                const data = JSON.parse(text);
                if (!data.ok) {
                  throw new Error(
                    data.message ||
                      "No se pudo guardar la imagen de la cancha.",
                  );
                }
              }),
            );

            lastError = undefined;
            break;
          } catch (error) {
            lastError = error;
          }
        }

        if (lastError) {
          throw lastError;
        }
      }

      await Promise.all(
        courtsToPersist.map(async (court) => {
          const horariosPayload = buildSchedulePayload(Number(court.id_cancha));

          if (!Number(court.id_cancha)) {
            return;
          }

          const response = await fetchJson(
            `/api/horarios/cancha/${court.id_cancha}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ horarios: horariosPayload }),
            },
          );

          if (!response.response.ok || !response.data?.ok) {
            throw new Error(
              response.data?.message ||
                "No se pudieron actualizar los horarios.",
            );
          }
        }),
      );

      Alert.alert(
        "Guardado",
        "Los cambios del complejo y las canchas se actualizaron en la base de datos.",
      );
    } catch (error) {
      console.warn("No se pudieron guardar cambios del administrador:", error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los cambios en la base de datos.",
      );
    } finally {
      setSavingAdmin(false);
      setUploadingPhoto(false);
    }
  };

  const fetchJson = async (url: string, options: RequestInit = {}) => {
    const candidates = getApiBaseCandidates();
    let lastError: unknown;

    for (const baseUrl of candidates) {
      try {
        const response = await fetch(`${baseUrl}${url}`, options);
        const rawText = await response.text();

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}: ${rawText || "Respuesta inválida del servidor"}`,
          );
        }

        const trimmed = rawText.trim();

        if (!trimmed) {
          throw new Error("La API no devolvió respuesta.");
        }

        if (trimmed.startsWith("<")) {
          throw new Error("La API respondió con HTML en lugar de JSON.");
        }

        return { response, data: JSON.parse(trimmed) };
      } catch (error) {
        lastError = error;
      }
    }

    throw new Error(
      lastError instanceof Error
        ? lastError.message
        : "La API no respondió en formato JSON. Reinicia el backend con npm run server.",
    );
  };

  useEffect(() => {
    if (selectedCourt?.id_cancha) {
      updateAvailabilityStatus(Number(selectedCourt.id_cancha));
    }
  }, [selectedCourt, updateAvailabilityStatus]);

  useEffect(() => {
    const loadCourts = async () => {
      try {
        const { response, data } = await fetchJson(`/api/canchas`);

        if (!response.ok || !Array.isArray(data.canchas)) {
          return;
        }

        const courts = data.canchas.filter(
          (item: any) => Number(item.id_complejo) === complexId,
        );

        if (courts.length > 0) {
          setAvailableCourts(courts);
          setSelectedCourt(
            courts.find((item: any) => Number(item.id_cancha) === canchaId) ||
              courts[0],
          );
          return;
        }

        if (canchaId) {
          setAvailableCourts([
            {
              id_cancha: canchaId,
              nombre_cancha: params.name || "Cancha",
              tipo_cancha: params.superficie || "Cancha",
              precio: params.precio ?? 0,
              superficie: params.superficie ?? null,
              imagen_url: params.imageUrl ?? null,
            },
          ]);
          setSelectedCourt({
            id_cancha: canchaId,
            nombre_cancha: params.name || "Cancha",
            tipo_cancha: params.superficie || "Cancha",
            precio: params.precio ?? 0,
            superficie: params.superficie ?? null,
            imagen_url: params.imageUrl ?? null,
          });
        }
      } catch (error) {
        console.warn("No se pudieron cargar las canchas del complejo:", error);
      }
    };

    if (complexId) {
      loadCourts();
    }
  }, [
    API_URL,
    complexId,
    canchaId,
    params.imageUrl,
    params.name,
    params.precio,
    params.superficie,
  ]);

  useEffect(() => {
    const loadCourtSchedules = async () => {
      if (!availableCourts.length) return;

      try {
        const schedules = await Promise.all(
          availableCourts.map(async (court) => {
            const { response, data } = await fetchJson(
              `/api/horarios/cancha/${court.id_cancha}`,
            );

            if (!response.ok || !Array.isArray(data.horarios)) {
              return [Number(court.id_cancha), normalizeScheduleMap("")];
            }

            const normalized = normalizeScheduleMap(
              data.horarios
                .map(
                  (item: any) =>
                    `${item.dia_semana}-${item.hora_apertura}a${item.hora_cierre}`,
                )
                .join(";"),
            );

            return [Number(court.id_cancha), normalized];
          }),
        );

        setCourtSchedules((prev) => {
          const next = { ...prev };
          schedules.forEach(([courtId, value]) => {
            next[Number(courtId)] = value;
          });
          return next;
        });
      } catch (error) {
        console.warn(
          "No se pudieron cargar los horarios de las canchas:",
          error,
        );
      }
    };

    loadCourtSchedules();
  }, [availableCourts, normalizeScheduleMap]);

  useEffect(() => {
    const loadAdminData = async () => {
      if (!isAdminMode || !complexId) return;

      try {
        const { response, data } = await fetchJson(
          `/api/canchas/complejo/${complexId}`,
        );

        if (!response.ok || !data.ok) {
          return;
        }

        const complejo = data.complejo || {};
        const canchas = Array.isArray(data.canchas) ? data.canchas : [];

        setComplexName(String(complejo.nombre_complejo || params.name || ""));
        setComplexAddress(String(complejo.direccion || params.address || ""));
        setComplexDescription(String(complejo.descripcion || ""));
        setPhotoUrl(String(complejo.imagen_url || params.imageUrl || ""));
        const detectedServices =
          String(complejo.descripcion || "")
            .toLowerCase()
            .match(/(parqueadero|vestidores|baños|cafeteria|tienda)/g) || [];
        setServicesText(detectedServices.join(", "));
        setSelectedServices(detectedServices);

        if (canchas.length > 0) {
          setAvailableCourts(canchas);
          setSelectedCourt(
            canchas.find((item: any) => Number(item.id_cancha) === canchaId) ||
              canchas[0],
          );
        }
      } catch (error) {
        console.warn(
          "No se pudo cargar información administrativa del complejo:",
          error,
        );
      }
    };

    loadAdminData();
  }, [
    API_URL,
    canchaId,
    complexId,
    isAdminMode,
    params.address,
    params.imageUrl,
    params.name,
  ]);

  useEffect(() => {
    const loadFavoriteState = async () => {
      const favoriteTargetId = Number(complexId || canchaId || 0);
      if (!favoriteTargetId) return;

      try {
        const sessionUser = await readSessionUser();
        if (!sessionUser?.id) return;

        const { response, data } = await fetchJson(
          `/api/favoritos?usuario_id=${sessionUser.id}`,
        );

        if (response.ok && data.ok) {
          const favoriteIds = (data.favoritos || []).map(Number);
          setIsFavorite(
            favoriteIds.includes(complexId) || favoriteIds.includes(canchaId),
          );
        }
      } catch (error) {
        console.warn("No se pudo cargar estado de favoritos:", error);
      }
    };

    loadFavoriteState();
  }, [API_URL, canchaId, complexId]);

  const formatMinutes = (value: number) => {
    const hours = Math.floor(value / 60)
      .toString()
      .padStart(2, "0");
    const minutes = (value % 60).toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const formatDateLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const toMinutes = (value: string) => {
    const [hours = 0, minutes = 0] = String(value || "00:00")
      .split(":")
      .map(Number);
    return hours * 60 + minutes;
  };

  const updateAvailabilityStatus = useCallback(
    async (canchaIdToCheck?: number) => {
      const activeCanchaId = Number(
        (canchaIdToCheck ?? selectedCourt?.id_cancha ?? canchaId) || 0,
      );

      if (!activeCanchaId) {
        setAvailabilityStatus(params.status || "No disponible");
        return;
      }

      try {
        const fecha = formatDateLocal(new Date());
        const now = new Date();
        const isToday = fecha === formatDateLocal(now);
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const response = await fetch(
          `${API_URL}/api/reservas/disponibilidad?id_cancha=${activeCanchaId}&fecha=${fecha}`,
        );
        const data = await response.json();

        if (!response.ok || !data.ok || !Array.isArray(data.bloques)) {
          setAvailabilityStatus("No disponible");
          return;
        }

        const hasAvailableSlot = data.bloques.some((slot: any) => {
          const isFutureSlot =
            !isToday || toMinutes(slot.hora_inicio) > currentMinutes;
          return Boolean(slot.disponible) && isFutureSlot;
        });

        setAvailabilityStatus(
          hasAvailableSlot ? "Disponible ahora" : "No disponible",
        );
      } catch {
        setAvailabilityStatus("No disponible");
      }
    },
    [API_URL, canchaId, params.status, selectedCourt?.id_cancha],
  );

  const handleDateChange = (_event: unknown, date?: Date) => {
    setShowDatePicker(false);

    if (date) {
      setSelectedDate(formatDateLocal(date));
    }
  };

  const loadAvailability = async () => {
    const activeCanchaId = Number(selectedCourt?.id_cancha || canchaId || 0);

    if (!activeCanchaId || !selectedDate) {
      Alert.alert(
        "Fecha requerida",
        "Ingresa una fecha válida para consultar horarios.",
      );
      return;
    }

    try {
      setAvailabilityLoading(true);
      setSelectedSlot(null);
      const response = await fetch(
        `${API_URL}/api/reservas/disponibilidad?id_cancha=${activeCanchaId}&fecha=${selectedDate}`,
      );
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "No se pudo cargar la disponibilidad.");
      }

      const now = new Date();
      const isToday = selectedDate === formatDateLocal(now);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const bloquesFiltrados = (data.bloques || []).map((slot: any) => {
        const bloquePasado =
          isToday && toMinutes(slot.hora_inicio) <= currentMinutes;

        return {
          ...slot,
          disponible: Boolean(slot.disponible) && !bloquePasado,
          estado: bloquePasado ? "no disponible" : slot.estado,
        };
      });

      setAvailability(bloquesFiltrados);

      if (
        !bloquesFiltrados.some(
          (item: { disponible?: boolean }) => item.disponible,
        )
      ) {
        Alert.alert(
          "Sin disponibilidad",
          "No hay horarios libres para esta fecha.",
        );
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "No se pudo consultar la disponibilidad.",
      );
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const toggleFavorite = async () => {
    const sessionUser = await readSessionUser();

    if (!sessionUser?.id) {
      Alert.alert(
        "Inicia sesión",
        "Debes iniciar sesión para guardar favoritos.",
      );
      router.push("/login");
      return;
    }

    try {
      setFavoriteLoading(true);
      const { response, data } = await fetchJson(`/api/favoritos/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_usuario: sessionUser.id,
          id_complejo: complexId || selectedCourt?.id_complejo || 0,
        }),
      });

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "No se pudo actualizar favoritos.");
      }

      setIsFavorite(Boolean(data.isFavorite));
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "No se pudo actualizar favoritos.",
      );
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleConfirmReservation = async () => {
    const activeCanchaId = Number(selectedCourt?.id_cancha || canchaId || 0);
    const activePrice = Number(selectedCourt?.precio ?? params.precio ?? 0);

    if (!selectedSlot) {
      Alert.alert(
        "Selecciona un horario",
        "Elige uno de los bloques disponibles para reservar.",
      );
      return;
    }

    const sessionUser = await readSessionUser();

    if (!sessionUser?.id) {
      Alert.alert("Inicia sesión", "Debes iniciar sesión para reservar.");
      router.push("/login");
      return;
    }

    try {
      setBookingLoading(true);
      const horaFin = formatMinutes(toMinutes(selectedSlot.hora_inicio) + 60);
      const response = await fetch(`${API_URL}/api/reservas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_deportista: sessionUser.id,
          id_cancha: activeCanchaId,
          fecha: selectedDate,
          hora_inicio: selectedSlot.hora_inicio,
          hora_fin: horaFin,
          precio_pagado: activePrice,
          estado: "pendiente",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "No se pudo crear la reserva.");
      }

      Alert.alert(
        "Reserva creada",
        data.message || "Tu reserva quedó registrada.",
      );
      setSelectedSlot(null);
      await loadAvailability();
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "No se pudo crear la reserva.",
      );
    } finally {
      setBookingLoading(false);
    }
  };

  const infoRows = [
    {
      label: "Distancia",
      value:
        params.distance && params.distance !== "null"
          ? params.distance
          : "null",
    },
    {
      label: "Estado",
      value: params.status && params.status !== "null" ? params.status : "null",
    },
    {
      label: "Superficie",
      value:
        params.superficie && params.superficie !== "null"
          ? params.superficie
          : "null",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topActions}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          {!isAdminMode && (
            <Pressable
              onPress={toggleFavorite}
              disabled={favoriteLoading}
              style={[
                styles.favoriteButton,
                isFavorite && styles.favoriteButtonActive,
              ]}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={20}
                color={isFavorite ? "#22C55E" : "#fff"}
              />
            </Pressable>
          )}
        </View>

        <View style={styles.card}>
          <Pressable onPress={() => setPreviewVisible(true)}>
            <View style={styles.imageWrapper}>
              <Image source={imageSource} style={styles.image} />
              <View style={styles.priceChip}>
                <Text style={styles.priceChipText}>
                  {formatPrice(
                    selectedCourt?.precio != null
                      ? String(selectedCourt.precio)
                      : params.precio,
                  )}
                </Text>
              </View>
            </View>
          </Pressable>
          <View style={styles.cardBody}>
            <View style={styles.badgeRow}>
              <View style={styles.statusChip}>
                <Text style={styles.statusChipText}>
                  {availabilityStatus || "Estado no disponible"}
                </Text>
              </View>
              <View style={styles.ratingChip}>
                <Ionicons name="football" size={14} color="#22C55E" />
                <Text style={styles.ratingText}>{params.rating || "0.0"}</Text>
              </View>
            </View>
            <Text style={styles.cardTitle}>{params.name || "null"}</Text>
            {selectedCourt && (
              <Text style={styles.selectedCourtLabel}>
                Cancha seleccionada:{" "}
                {selectedCourt.nombre_cancha || "Cancha principal"}
              </Text>
            )}
            <Text style={styles.cardSubtitle}>
              {params.address && params.address !== "null"
                ? params.address
                : "Dirección no disponible"}
            </Text>
          </View>
        </View>

        {!isAdminMode && (
          <View style={styles.bookingCard}>
            <Text style={styles.sectionTitle}>Canchas disponibles</Text>
            <Text style={styles.helperText}>
              Elige la cancha del complejo para consultar sus horarios.
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.courtChipsRow}
            >
              {availableCourts.length === 0 ? (
                <Text style={styles.emptySlotText}>
                  No hay otras canchas disponibles en este complejo.
                </Text>
              ) : (
                availableCourts.map((court) => {
                  const isSelected =
                    Number(selectedCourt?.id_cancha) ===
                    Number(court.id_cancha);
                  return (
                    <Pressable
                      key={court.id_cancha}
                      style={[
                        styles.courtChip,
                        isSelected && styles.courtChipActive,
                      ]}
                      onPress={() => {
                        setSelectedCourt(court);
                        setSelectedSlot(null);
                        setAvailability([]);
                      }}
                    >
                      <Text
                        style={[
                          styles.courtChipText,
                          isSelected && styles.courtChipTextActive,
                        ]}
                      >
                        {court.nombre_cancha || `Cancha ${court.id_cancha}`}
                      </Text>
                      <Text style={styles.courtChipMeta}>
                        {court.tipo_cancha || court.superficie || "Cancha"}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        )}

        {isAdminMode && (
          <View style={styles.bookingCard}>
            <Text style={styles.sectionTitle}>Gestión del complejo</Text>
            <Text style={styles.helperText}>
              Ajusta los datos del complejo, fotos, servicios y precios por
              cancha.
            </Text>

            <Text style={styles.inputLabel}>Nombre del complejo</Text>
            <TextInput
              value={complexName}
              onChangeText={setComplexName}
              style={styles.textInput}
              placeholder="Nombre del complejo"
            />

            <Text style={styles.inputLabel}>Dirección</Text>
            <TextInput
              value={complexAddress}
              onChangeText={setComplexAddress}
              style={styles.textInput}
              placeholder="Dirección"
            />

            <Text style={styles.inputLabel}>Descripción</Text>
            <TextInput
              value={complexDescription}
              onChangeText={setComplexDescription}
              style={[styles.textInput, styles.textAreaInput]}
              multiline
              placeholder="Descripción del complejo"
            />

            <Text style={styles.inputLabel}>Foto de la cancha</Text>
            <Pressable
              style={[
                styles.secondaryButton,
                uploadingPhoto && styles.secondaryButtonDisabled,
              ]}
              onPress={pickCourtPhoto}
              disabled={uploadingPhoto}
            >
              <Text style={styles.secondaryButtonText}>
                {uploadingPhoto
                  ? "Subiendo foto..."
                  : "Elegir foto desde la galería"}
              </Text>
            </Pressable>
            {photoUrl ? (
              <Image
                source={{ uri: photoUrl }}
                style={styles.adminPhotoPreview}
              />
            ) : null}

            <Text style={styles.inputLabel}>Servicios</Text>
            <View style={styles.filterRow}>
              {serviceOptions.map((service) => {
                const active = selectedServices.includes(service);
                return (
                  <Pressable
                    key={service}
                    onPress={() =>
                      setSelectedServices((prev) =>
                        active
                          ? prev.filter((item) => item !== service)
                          : [...prev, service],
                      )
                    }
                    style={[
                      styles.serviceChip,
                      active && styles.serviceChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.serviceChipText,
                        active && styles.serviceChipTextActive,
                      ]}
                    >
                      {service}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              value={servicesText}
              onChangeText={setServicesText}
              style={styles.textInput}
              placeholder="parqueadero, vestidores, baños..."
            />

            <Text style={styles.inputLabel}>Horarios por cancha</Text>

            <Pressable style={styles.secondaryButton} onPress={addCourtDraft}>
              <Text style={styles.secondaryButtonText}>
                Agregar otra cancha
              </Text>
            </Pressable>

            {availableCourts.map((court) => (
              <View key={court.id_cancha} style={styles.adminCourtCard}>
                <Text style={styles.adminCourtTitle}>
                  {court.nombre_cancha || `Cancha ${court.id_cancha}`}
                </Text>

                <View style={styles.scheduleEditorCard}>
                  {weekDays.map((day) => {
                    const entry =
                      courtSchedules[Number(court.id_cancha)]?.[day] ||
                      defaultSchedule;

                    return (
                      <View
                        key={`${court.id_cancha}-${day}`}
                        style={styles.scheduleDayCard}
                      >
                        <Pressable
                          style={styles.scheduleDayHeader}
                          onPress={() =>
                            toggleCourtScheduleDay(Number(court.id_cancha), day)
                          }
                        >
                          <Text style={styles.scheduleDayLabel}>
                            {weekDayLabels[day]}
                          </Text>
                          <View
                            style={[
                              styles.scheduleToggle,
                              entry.enabled && styles.scheduleToggleActive,
                            ]}
                          >
                            <Text style={styles.scheduleToggleText}>
                              {entry.enabled ? "Activo" : "Inactivo"}
                            </Text>
                          </View>
                        </Pressable>

                        {entry.enabled && (
                          <View style={styles.scheduleTimeRow}>
                            <View style={styles.scheduleTimeField}>
                              <Text style={styles.inputLabel}>Abre</Text>
                              <TextInput
                                value={entry.open}
                                onChangeText={(value) =>
                                  updateCourtScheduleField(
                                    Number(court.id_cancha),
                                    day,
                                    "open",
                                    value,
                                  )
                                }
                                style={styles.textInput}
                                placeholder="08:00"
                              />
                            </View>
                            <View style={styles.scheduleTimeField}>
                              <Text style={styles.inputLabel}>Cierra</Text>
                              <TextInput
                                value={entry.close}
                                onChangeText={(value) =>
                                  updateCourtScheduleField(
                                    Number(court.id_cancha),
                                    day,
                                    "close",
                                    value,
                                  )
                                }
                                style={styles.textInput}
                                placeholder="20:00"
                              />
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>

                <Pressable
                  style={[styles.secondaryButton, styles.deleteButton]}
                  onPress={() => {
                    if (Number(court.id_cancha) < 0) {
                      setAvailableCourts((prev) =>
                        prev.filter(
                          (item) =>
                            Number(item.id_cancha) !== Number(court.id_cancha),
                        ),
                      );
                      return;
                    }

                    Alert.alert(
                      "Eliminar cancha",
                      `¿Deseas eliminar ${court.nombre_cancha || "esta cancha"} del complejo?`,
                      [
                        { text: "Cancelar", style: "cancel" },
                        {
                          text: "Eliminar",
                          style: "destructive",
                          onPress: async () => {
                            try {
                              const response = await fetchJson(
                                `/api/canchas/${court.id_cancha}`,
                                { method: "DELETE" },
                              );

                              if (!response.response.ok || !response.data?.ok) {
                                throw new Error(
                                  response.data?.message ||
                                    "No se pudo eliminar la cancha.",
                                );
                              }

                              setAvailableCourts((prev) =>
                                prev.filter(
                                  (item) =>
                                    Number(item.id_cancha) !==
                                    Number(court.id_cancha),
                                ),
                              );
                              Alert.alert(
                                "Eliminada",
                                "La cancha fue eliminada del complejo.",
                              );
                            } catch (error) {
                              Alert.alert(
                                "Error",
                                error instanceof Error
                                  ? error.message
                                  : "No se pudo eliminar la cancha.",
                              );
                            }
                          },
                        },
                      ],
                    );
                  }}
                >
                  <Text style={styles.secondaryButtonText}>
                    Eliminar cancha
                  </Text>
                </Pressable>

                <TextInput
                  value={String(court.nombre_cancha || "")}
                  onChangeText={(value) =>
                    updateCourtField(court.id_cancha, "nombre_cancha", value)
                  }
                  style={styles.textInput}
                  placeholder="Nombre de la cancha"
                />
                <TextInput
                  value={String(court.tipo_cancha || "")}
                  onChangeText={(value) =>
                    updateCourtField(court.id_cancha, "tipo_cancha", value)
                  }
                  style={styles.textInput}
                  placeholder="Futbol 5 / 7 / 8 / 11"
                />
                <TextInput
                  value={String(court.precio ?? "")}
                  onChangeText={(value) =>
                    updateCourtField(court.id_cancha, "precio", value)
                  }
                  style={styles.textInput}
                  keyboardType="numeric"
                  placeholder="Precio"
                />
                <TextInput
                  value={String(court.superficie || "")}
                  onChangeText={(value) =>
                    updateCourtField(court.id_cancha, "superficie", value)
                  }
                  style={styles.textInput}
                  placeholder="Natural / Sintética"
                />
              </View>
            ))}

            <Pressable
              style={[
                styles.reserveButton,
                savingAdmin && styles.reserveButtonDisabled,
              ]}
              onPress={handleSaveAdminChanges}
              disabled={savingAdmin}
            >
              <Text style={styles.reserveButtonText}>
                {savingAdmin ? "Guardando..." : "Guardar cambios"}
              </Text>
            </Pressable>
          </View>
        )}

        {!isAdminMode && (
          <View style={styles.bookingCard}>
            <Text style={styles.sectionTitle}>Reserva rápida</Text>
            <Text style={styles.helperText}>
              Elige una fecha y selecciona el bloque disponible para la cancha
              activa.
            </Text>

            <Text style={styles.inputLabel}>Fecha</Text>
            <Pressable
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color="#16A34A" />
              <Text style={styles.dateButtonText}>{selectedDate}</Text>
            </Pressable>

            {showDatePicker && (
              <DateTimePicker
                value={new Date(selectedDate)}
                mode="date"
                display="default"
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}

            <View style={styles.bookingActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.secondaryButtonPressed,
                  availabilityLoading && styles.secondaryButtonDisabled,
                ]}
                onPress={loadAvailability}
                disabled={availabilityLoading}
              >
                <Text style={styles.secondaryButtonText}>
                  {availabilityLoading
                    ? "Consultando..."
                    : "Ver disponibilidad"}
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.reserveButton,
                  pressed && styles.reserveButtonPressed,
                  bookingLoading && styles.reserveButtonDisabled,
                ]}
                onPress={handleConfirmReservation}
                disabled={bookingLoading}
              >
                <Text style={styles.reserveButtonText}>
                  {bookingLoading ? "Reservando..." : "Reservar ahora"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.slotGrid}>
              {availability.length === 0 ? (
                <Text style={styles.emptySlotText}>
                  Consulta la disponibilidad para ver los bloques libres.
                </Text>
              ) : (
                availability.map((slot) => {
                  const isSelected =
                    selectedSlot?.hora_inicio === slot.hora_inicio;
                  return (
                    <Pressable
                      key={`${slot.hora_inicio}-${slot.hora_fin}`}
                      style={[
                        styles.slotCard,
                        slot.disponible
                          ? styles.slotAvailable
                          : styles.slotOccupied,
                        isSelected && styles.slotSelected,
                      ]}
                      onPress={() => slot.disponible && setSelectedSlot(slot)}
                      disabled={!slot.disponible}
                    >
                      <Text style={styles.slotTime}>
                        {slot.hora_inicio} - {slot.hora_fin}
                      </Text>
                      <Text style={styles.slotState}>
                        {slot.disponible
                          ? "Disponible"
                          : slot.estado === "no disponible"
                            ? "Ya pasó"
                            : "Ocupado"}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </View>
          </View>
        )}

        {!isAdminMode && (
          <>
            <View style={styles.infoBox}>
              {infoRows.map((item) => (
                <View key={item.label} style={styles.row}>
                  <Text style={styles.label}>{item.label}</Text>
                  <Text style={styles.value}>{item.value}</Text>
                </View>
              ))}
            </View>

            <View style={styles.scheduleCard}>
              <Text style={styles.sectionTitle}>Horarios</Text>
              {horarios.length > 0 ? (
                <View style={styles.scheduleList}>
                  {horarios.map((item, index) => (
                    <View key={`${item}-${index}`} style={styles.scheduleChip}>
                      <Text style={styles.scheduleChipText}>{item}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyScheduleText}>
                  No hay horarios disponibles.
                </Text>
              )}
            </View>

            <View style={styles.mapCard}>
              <Text style={styles.mapTitle}>Ubicación en Google Maps</Text>
              {latitude !== null && longitude !== null ? (
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={{
                    latitude,
                    longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                >
                  <Marker
                    coordinate={{ latitude, longitude }}
                    title={params.name || "Cancha"}
                  />
                </MapView>
              ) : (
                <View style={styles.mapPlaceholder}>
                  <Text style={styles.mapPlaceholderText}>
                    No hay coordenadas disponibles
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={previewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <Pressable
          style={styles.previewBackdrop}
          onPress={() => setPreviewVisible(false)}
        >
          <View style={styles.previewContainer}>
            <Pressable
              style={styles.previewCloseButton}
              onPress={() => setPreviewVisible(false)}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
            <Image
              source={imageSource}
              style={styles.previewImage}
              resizeMode="contain"
            />
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1F1F1F" },
  content: { padding: 18, paddingBottom: 36 },
  topActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  backButton: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: "#22C55E",
  },
  favoriteButton: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: "rgba(17, 24, 39, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  favoriteButtonActive: {
    backgroundColor: "rgba(34, 197, 94, 0.16)",
    borderColor: "rgba(34, 197, 94, 0.55)",
  },
  homeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#2A2A2A",
  },
  homeButtonText: {
    color: "#F9FAFB",
    fontSize: 13,
    fontWeight: "700",
  },
  bookingCard: {
    backgroundColor: "#2A2A2A",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  helperText: {
    color: "#C7C7C7",
    fontSize: 13,
    marginBottom: 10,
  },
  inputLabel: {
    color: "#F9FAFB",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: "#1F1F1F",
    borderColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#F9FAFB",
    fontSize: 13,
    marginBottom: 10,
  },
  textAreaInput: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  serviceChip: {
    borderRadius: 999,
    backgroundColor: "#2A2A2A",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  serviceChipActive: {
    backgroundColor: "rgba(34,197,94,0.16)",
    borderColor: "rgba(134,239,172,0.4)",
  },
  serviceChipText: { color: "#D1D5DB", fontSize: 11, fontWeight: "700" },
  serviceChipTextActive: { color: "#ECFDF5" },
  scheduleEditorCard: {
    backgroundColor: "#1F1F1F",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.18)",
    padding: 10,
    marginTop: 8,
    marginBottom: 10,
  },
  scheduleDayCard: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    paddingBottom: 8,
    marginBottom: 8,
  },
  scheduleDayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  scheduleDayLabel: {
    color: "#F9FAFB",
    fontSize: 13,
    fontWeight: "700",
  },
  scheduleToggle: {
    backgroundColor: "#2A2A2A",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  scheduleToggleActive: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderColor: "rgba(34,197,94,0.35)",
  },
  scheduleToggleText: {
    color: "#C7C7C7",
    fontSize: 11,
    fontWeight: "700",
  },
  scheduleTimeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  scheduleTimeField: {
    flex: 1,
  },
  adminCourtCard: {
    backgroundColor: "#1F1F1F",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.18)",
    padding: 10,
    marginBottom: 10,
  },
  adminPhotoPreview: {
    width: "100%",
    height: 160,
    borderRadius: 14,
    marginTop: 10,
    backgroundColor: "#111827",
  },
  adminCourtTitle: {
    color: "#86EFAC",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2A2A2A",
    borderColor: "#3A3A3A",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  dateButtonText: {
    color: "#F9FAFB",
    fontSize: 14,
    fontWeight: "700",
  },
  bookingActions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#333333",
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryButtonPressed: {
    opacity: 0.9,
  },
  secondaryButtonDisabled: {
    opacity: 0.7,
  },
  secondaryButtonText: {
    color: "#F9FAFB",
    fontSize: 13,
    fontWeight: "700",
  },
  reserveButton: {
    flex: 1,
    backgroundColor: "#22C55E",
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  reserveButtonPressed: {
    opacity: 0.9,
  },
  reserveButtonDisabled: {
    opacity: 0.7,
  },
  reserveButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  slotCard: {
    width: "48%",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  slotAvailable: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderColor: "rgba(34,197,94,0.35)",
  },
  slotOccupied: {
    backgroundColor: "rgba(248,113,113,0.12)",
    borderColor: "rgba(248,113,113,0.25)",
  },
  slotSelected: {
    borderColor: "#22C55E",
    shadowColor: "#22C55E",
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  slotTime: {
    color: "#F9FAFB",
    fontSize: 13,
    fontWeight: "700",
  },
  slotState: {
    color: "#C7C7C7",
    fontSize: 11,
    marginTop: 2,
  },
  emptySlotText: {
    color: "#C7C7C7",
    fontSize: 13,
  },
  title: { color: "#F9FAFB", fontSize: 22, fontWeight: "800" },
  selectedCourtLabel: {
    color: "#86EFAC",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  courtChipsRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  courtChip: {
    minWidth: 140,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#333333",
    borderWidth: 1,
    borderColor: "#3A3A3A",
  },
  courtChipActive: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderColor: "rgba(34,197,94,0.45)",
  },
  courtChipText: {
    color: "#F9FAFB",
    fontSize: 13,
    fontWeight: "700",
  },
  courtChipTextActive: {
    color: "#86EFAC",
  },
  courtChipMeta: {
    color: "#C7C7C7",
    fontSize: 11,
    marginTop: 2,
  },
  card: {
    backgroundColor: "transparent",
    borderRadius: 0,
    overflow: "visible",
    marginBottom: 16,
    borderWidth: 0,
    borderColor: "transparent",
  },
  imageWrapper: { position: "relative" },
  image: { width: "100%", height: 180 },
  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.92)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  previewContainer: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
  },
  previewCloseButton: {
    alignSelf: "flex-end",
    marginBottom: 8,
    padding: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  previewImage: {
    width: "100%",
    height: 360,
    borderRadius: 18,
    backgroundColor: "#111111",
  },
  priceChip: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.45)",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  priceChipText: {
    color: "#22C55E",
    fontSize: 12,
    fontWeight: "800",
  },
  cardBody: { paddingHorizontal: 14, paddingBottom: 14 },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  statusChip: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.25)",
  },
  statusChipText: { color: "#16A34A", fontSize: 12, fontWeight: "700" },
  ratingChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2A2A2A",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4,
  },
  ratingText: { color: "#F9FAFB", fontSize: 12, fontWeight: "700" },
  cardTitle: { color: "#F9FAFB", fontSize: 22, fontWeight: "800" },
  cardSubtitle: { color: "#C7C7C7", fontSize: 14, marginTop: 4 },
  infoBox: {
    backgroundColor: "transparent",
    borderRadius: 0,
    padding: 14,
    marginBottom: 16,
    borderWidth: 0,
    borderColor: "transparent",
  },
  scheduleCard: {
    backgroundColor: "transparent",
    borderRadius: 0,
    padding: 14,
    marginBottom: 16,
    borderWidth: 0,
    borderColor: "transparent",
  },
  sectionTitle: {
    color: "#F9FAFB",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 10,
  },
  scheduleList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  scheduleChip: {
    backgroundColor: "rgba(34,197,94,0.10)",
    borderWidth: 0,
    borderColor: "transparent",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  scheduleChipText: {
    color: "#16A34A",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyScheduleText: {
    color: "#C7C7C7",
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 0,
    borderBottomColor: "transparent",
    paddingVertical: 8,
  },
  label: { color: "#C7C7C7", fontSize: 14, fontWeight: "600", flex: 1 },
  value: {
    color: "#F9FAFB",
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
    textAlign: "right",
  },
  mapCard: {
    backgroundColor: "transparent",
    borderRadius: 0,
    padding: 14,
    borderWidth: 0,
    borderColor: "transparent",
  },
  mapTitle: {
    color: "#F9FAFB",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  map: { width: "100%", height: 220, borderRadius: 16 },
  mapPlaceholder: {
    height: 220,
    borderRadius: 16,
    backgroundColor: "#333333",
    justifyContent: "center",
    alignItems: "center",
  },
  mapPlaceholderText: { color: "#C7C7C7", fontSize: 14 },
});
