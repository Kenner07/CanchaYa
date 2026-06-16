const path = require("path");
const os = require("os");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
require("dotenv").config({ path: path.resolve(__dirname, "utils", ".env") });
const fs = require("fs/promises");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { getPool } = require("./config/db");
const upload = require("./config/multerCloudinary");
const reservasRoutes = require("./routes/reservas");
const {
  ensureNotificationColumns,
  savePushToken,
} = require("./utils/notifications");

const app = express();
const PORT = process.env.API_PORT || 3001;
const getLanHost = () => {
  const interfaces = os.networkInterfaces();

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry.family === "IPv4" && !entry.internal) {
        return entry.address;
      }
    }
  }

  return "0.0.0.0";
};
const HOST = process.env.API_HOST || getLanHost();

const FALLBACK_USERS_FILE = path.join(__dirname, "bd", "users.json");

app.use(cors());
app.use(express.json());
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

async function readFallbackUsers() {
  try {
    const raw = await fs.readFile(FALLBACK_USERS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("No se pudieron cargar usuarios de respaldo:", error.message);
    return [];
  }
}

async function authenticateFallbackUser(email, password) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  const users = await readFallbackUsers();
  const user = users.find(
    (item) =>
      String(item.email || "")
        .trim()
        .toLowerCase() === normalizedEmail,
  );

  if (!user) {
    return null;
  }

  const storedPassword = String(user.password || "");
  const passwordMatches = storedPassword.startsWith("$2")
    ? await bcrypt.compare(password, storedPassword)
    : storedPassword === String(password);

  return passwordMatches ? user : null;
}

async function ensureFavoritesTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS favoritos (
      id_favorito INT NOT NULL AUTO_INCREMENT,
      id_usuario INT NOT NULL,
      id_complejo INT NOT NULL,
      fecha_agregado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id_favorito),
      UNIQUE KEY uq_favoritos_usuario_complejo (id_usuario, id_complejo),
      CONSTRAINT fk_favoritos_complejo FOREIGN KEY (id_complejo) REFERENCES complejos(id_complejo) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  try {
    const [columns] = await connection.query(
      "SHOW COLUMNS FROM favoritos LIKE 'id_cancha'",
    );
    if (Array.isArray(columns) && columns.length > 0) {
      await connection.query(
        "ALTER TABLE favoritos DROP FOREIGN KEY fk_favoritos_cancha",
      );
      await connection.query(
        "ALTER TABLE favoritos DROP INDEX uq_favoritos_usuario_cancha",
      );
      await connection.query("ALTER TABLE favoritos DROP COLUMN id_cancha");
    }
  } catch (error) {
    console.warn(
      "No fue necesario migrar la tabla favoritos:",
      error.message || error,
    );
  }

  try {
    await connection.query(
      "ALTER TABLE favoritos ADD UNIQUE INDEX uq_favoritos_usuario_complejo (id_usuario, id_complejo)",
    );
  } catch (error) {
    if (!String(error.message || error).includes("Duplicate key name")) {
      console.warn(
        "No se pudo asegurar el índice único de favoritos:",
        error.message || error,
      );
    }
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "API de CanchaYa activa" });
});

app.post("/api/notifications/register-token", async (req, res) => {
  try {
    const { userType, userId, token } = req.body || {};

    if (!userType || !userId || !token) {
      return res.status(400).json({
        ok: false,
        message: "Debe enviar userType, userId y token.",
      });
    }

    const connection = await getPool();
    await ensureNotificationColumns(connection);

    if (userType === "deportista") {
      await savePushToken(
        connection,
        "deportistas",
        "id_deportista",
        userId,
        token,
      );
    } else if (userType === "administrador_gerentes") {
      await savePushToken(
        connection,
        "administradores_gerentes",
        "id_usuario",
        userId,
        token,
      );
    } else {
      return res
        .status(400)
        .json({ ok: false, message: "Tipo de usuario no válido." });
    }

    return res.json({ ok: true, message: "Token de notificación guardado." });
  } catch (error) {
    console.error("Error al guardar token de notificación:", error);
    return res.status(500).json({
      ok: false,
      message: "No se pudo guardar el token de notificación.",
    });
  }
});

app.use("/api/reservas", reservasRoutes);

app.post(
  "/api/profile/upload-photo",
  upload.single("photo"),
  async (req, res) => {
    try {
      const userId = Number(req.body?.userId || 0);
      const uploadedFile = req.file;
      const normalizeRemoteUrl = (value) =>
        String(value || "")
          .trim()
          .replace(/\\/g, "/")
          .replace(/https:\/(?!\/)/gi, "https://")
          .replace(/http:\/(?!\/)/gi, "http://");

      const remoteCandidate = normalizeRemoteUrl(
        uploadedFile?.secure_url || uploadedFile?.url || uploadedFile?.path,
      );
      const hasRemoteUrl = /^https?:\/\//i.test(remoteCandidate);

      const localFilePath =
        uploadedFile?.path && !hasRemoteUrl
          ? `${req.protocol}://${req.get("host")}/${path
              .relative(__dirname, String(uploadedFile.path))
              .replace(/\\/g, "/")}`
          : null;

      const publicImageUrl = hasRemoteUrl ? remoteCandidate : localFilePath;

      if (!userId || !publicImageUrl) {
        return res.status(400).json({
          ok: false,
          message: "Debe enviar la foto y el id del usuario.",
        });
      }

      const connection = await getPool();

      await connection.query(`
      ALTER TABLE deportistas
      ADD COLUMN IF NOT EXISTS foto_perfil VARCHAR(500) NULL
    `);

      await connection.query(
        "UPDATE deportistas SET foto_perfil = ? WHERE id_deportista = ?",
        [publicImageUrl, userId],
      );

      return res.json({
        ok: true,
        imageUrl: publicImageUrl,
        message: "Foto de perfil actualizada correctamente.",
      });
    } catch (error) {
      console.error("Error al subir foto de perfil:", error);
      return res.status(500).json({
        ok: false,
        message: "No se pudo actualizar la foto de perfil.",
      });
    }
  },
);

app.get("/api/favoritos", async (req, res) => {
  try {
    const idUsuario = Number(req.query.usuario_id || 0);

    if (!idUsuario) {
      return res.status(400).json({
        ok: false,
        message: "Debe enviar usuario_id para consultar favoritos.",
      });
    }

    const connection = await getPool();
    await ensureFavoritesTable(connection);

    const [rows] = await connection.query(
      `SELECT DISTINCT f.id_complejo
       FROM favoritos f
       WHERE f.id_usuario = ?
       ORDER BY f.id_complejo DESC`,
      [idUsuario],
    );

    return res.json({
      ok: true,
      favoritos: rows
        .map((item) => Number(item.id_complejo))
        .filter((value) => Number.isFinite(value) && value > 0),
    });
  } catch (error) {
    console.error("Error al consultar favoritos:", error);
    return res.status(500).json({
      ok: false,
      message: "No se pudieron cargar los favoritos.",
    });
  }
});

app.get("/api/favoritos/detalle", async (req, res) => {
  try {
    const idUsuario = Number(req.query.usuario_id || 0);

    if (!idUsuario) {
      return res.status(400).json({
        ok: false,
        message: "Debe enviar usuario_id para consultar favoritos.",
      });
    }

    const connection = await getPool();
    await ensureFavoritesTable(connection);

    const [rows] = await connection.query(
      `SELECT
         c.id_cancha,
         f.id_complejo,
         co.nombre_complejo,
         c.nombre_cancha,
         co.direccion AS direccion_cancha,
         c.precio,
         c.superficie,
         NULL AS capacidad,
         COALESCE(
           (
             SELECT GROUP_CONCAT(
               CONCAT(hc.dia_semana, '-', hc.hora_apertura, 'a', hc.hora_cierre)
               SEPARATOR ';'
             )
             FROM horarios_cancha hc
             INNER JOIN canchas hc_cancha ON hc_cancha.id_cancha = hc.id_cancha
             WHERE hc_cancha.id_complejo = f.id_complejo
           ),
           ''
         ) AS horario,
         co.valoracion,
         co.latitud,
         co.longitud,
         COALESCE(
           (
             SELECT ic.url_imagen
             FROM imagenes_cancha ic
             WHERE ic.id_cancha = c.id_cancha
             ORDER BY ic.id_imagen
             LIMIT 1
           ),
           ''
         ) AS imagen_url,
         f.fecha_agregado
       FROM favoritos f
       INNER JOIN complejos co ON co.id_complejo = f.id_complejo
       INNER JOIN canchas c ON c.id_complejo = f.id_complejo
       WHERE f.id_usuario = ?
         AND c.id_cancha = (
           SELECT ic.id_cancha
           FROM canchas ic
           WHERE ic.id_complejo = f.id_complejo
           ORDER BY ic.id_cancha
           LIMIT 1
         )
       ORDER BY f.fecha_agregado DESC`,
      [idUsuario],
    );

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const favoritos = rows.map((field) => {
      const imagenUrl = field.imagen_url;

      return {
        ...field,
        imagen_url:
          imagenUrl && !/^https?:\/\//i.test(imagenUrl)
            ? `${baseUrl}${imagenUrl.startsWith("/") ? imagenUrl : `/${imagenUrl}`}`
            : imagenUrl || null,
      };
    });

    return res.json({ ok: true, favoritos });
  } catch (error) {
    console.error("Error al consultar favoritos detallados:", error);
    return res.status(500).json({
      ok: false,
      message: "No se pudieron cargar los favoritos.",
    });
  }
});

app.get("/api/reservas/usuario/:id_deportista", async (req, res) => {
  try {
    const idDeportista = Number(req.params.id_deportista || 0);

    if (!idDeportista) {
      return res.status(400).json({
        ok: false,
        message: "Debe enviar el id del deportista.",
      });
    }

    const connection = await getPool();

    const [rows] = await connection.query(
      `SELECT
         r.id_reserva,
         r.id_deportista,
         r.id_cancha,
         r.fecha,
         r.hora_inicio,
         r.hora_fin,
         r.precio_pagado,
         r.estado,
         r.fecha_creacion,
         c.nombre_cancha,
         co.nombre_complejo,
         co.direccion AS direccion_cancha,
         COALESCE(
           (
             SELECT ic.url_imagen
             FROM imagenes_cancha ic
             WHERE ic.id_cancha = c.id_cancha
             ORDER BY ic.id_imagen
             LIMIT 1
           ),
           ''
         ) AS imagen_url
       FROM reservas r
       INNER JOIN canchas c ON c.id_cancha = r.id_cancha
       INNER JOIN complejos co ON co.id_complejo = c.id_complejo
       WHERE r.id_deportista = ?
       ORDER BY r.fecha DESC, r.hora_inicio ASC`,
      [idDeportista],
    );

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const reservas = rows.map((field) => {
      const imagenUrl = field.imagen_url;

      return {
        ...field,
        imagen_url:
          imagenUrl && !/^https?:\/\//i.test(imagenUrl)
            ? `${baseUrl}${imagenUrl.startsWith("/") ? imagenUrl : `/${imagenUrl}`}`
            : imagenUrl || null,
      };
    });

    return res.json({ ok: true, reservas });
  } catch (error) {
    console.error("Error al listar reservas del usuario:", error);
    return res.status(500).json({
      ok: false,
      message: "No se pudieron cargar las reservas del usuario.",
    });
  }
});

app.post("/api/favoritos/toggle", async (req, res) => {
  try {
    const { id_usuario, id_complejo } = req.body || {};

    if (!id_usuario) {
      return res.status(400).json({
        ok: false,
        message: "Debe enviar id_usuario.",
      });
    }

    const connection = await getPool();
    await ensureFavoritesTable(connection);

    const usuarioId = Number(id_usuario);
    const complejoId = Number(id_complejo || 0);

    if (!usuarioId || !complejoId) {
      return res.status(400).json({
        ok: false,
        message: "Debe enviar id_usuario e id_complejo válidos.",
      });
    }

    const [existingRows] = await connection.query(
      `SELECT id_favorito FROM favoritos
       WHERE id_usuario = ?
         AND id_complejo = ?
       LIMIT 1`,
      [usuarioId, complejoId],
    );

    if (existingRows.length > 0) {
      await connection.query(
        `DELETE FROM favoritos
         WHERE id_usuario = ?
           AND id_complejo = ?`,
        [usuarioId, complejoId],
      );

      return res.json({
        ok: true,
        isFavorite: false,
        message: "Complejo removido de favoritos.",
      });
    }

    await connection.query(
      "INSERT INTO favoritos (id_usuario, id_complejo) VALUES (?, ?)",
      [usuarioId, complejoId],
    );

    return res.json({
      ok: true,
      isFavorite: true,
      message: "Complejo agregado a favoritos.",
    });
  } catch (error) {
    console.error("Error al alternar favoritos:", error);
    return res.status(500).json({
      ok: false,
      message: "No se pudo actualizar favoritos.",
    });
  }
});

app.get("/api/canchas/complejo/:id_complejo", async (req, res) => {
  try {
    const connection = await getPool();
    const idComplejo = Number(req.params.id_complejo || 0);

    if (!idComplejo) {
      return res
        .status(400)
        .json({ ok: false, message: "ID de complejo inválido." });
    }

    const [rows] = await connection.query(
      `SELECT
         c.id_cancha,
         c.id_complejo,
         c.nombre_cancha,
         c.tipo_cancha,
         c.precio,
         c.superficie,
         c.estado,
         co.nombre_complejo,
         co.descripcion,
         co.direccion,
         co.valoracion,
         co.id_usuario AS id_gerente,
         COALESCE(
           (
             SELECT ic.url_imagen
             FROM imagenes_cancha ic
             WHERE ic.id_cancha = c.id_cancha
             ORDER BY ic.id_imagen
             LIMIT 1
           ),
           ''
         ) AS imagen_url
       FROM canchas c
       INNER JOIN complejos co ON co.id_complejo = c.id_complejo
       WHERE c.id_complejo = ?
       ORDER BY c.id_cancha ASC`,
      [idComplejo],
    );

    return res.json({ ok: true, complejo: rows[0] || null, canchas: rows });
  } catch (error) {
    console.error("Error en /api/canchas/complejo/:id_complejo:", error);
    return res
      .status(500)
      .json({ ok: false, message: "No se pudo cargar el complejo." });
  }
});

app.get("/api/horarios/cancha/:id_cancha", async (req, res) => {
  try {
    const connection = await getPool();
    const idCancha = Number(req.params.id_cancha || 0);

    if (!idCancha) {
      return res
        .status(400)
        .json({ ok: false, message: "ID de cancha inválido." });
    }

    const [rows] = await connection.query(
      `SELECT id_horario, id_cancha, dia_semana, hora_apertura, hora_cierre
       FROM horarios_cancha
       WHERE id_cancha = ?
       ORDER BY FIELD(dia_semana, 'lunes','martes','miercoles','jueves','viernes','sabado','domingo')`,
      [idCancha],
    );

    return res.json({ ok: true, horarios: rows });
  } catch (error) {
    console.error("Error en /api/horarios/cancha/:id_cancha:", error);
    return res
      .status(500)
      .json({ ok: false, message: "No se pudieron cargar los horarios." });
  }
});

app.patch("/api/complejos/:id_complejo", async (req, res) => {
  try {
    const connection = await getPool();
    const idComplejo = Number(req.params.id_complejo || 0);
    const { nombre_complejo, descripcion, direccion, valoracion } =
      req.body || {};

    if (!idComplejo) {
      return res
        .status(400)
        .json({ ok: false, message: "ID de complejo inválido." });
    }

    await connection.query(
      `UPDATE complejos
       SET nombre_complejo = COALESCE(?, nombre_complejo),
           descripcion = COALESCE(?, descripcion),
           direccion = COALESCE(?, direccion),
           valoracion = COALESCE(?, valoracion)
       WHERE id_complejo = ?`,
      [
        nombre_complejo ?? null,
        descripcion ?? null,
        direccion ?? null,
        valoracion ?? null,
        idComplejo,
      ],
    );

    return res.json({
      ok: true,
      message: "Complejo actualizado correctamente.",
    });
  } catch (error) {
    console.error("Error en PATCH /api/complejos/:id_complejo:", error);
    return res
      .status(500)
      .json({ ok: false, message: "No se pudo actualizar el complejo." });
  }
});

app.post("/api/canchas", async (req, res) => {
  try {
    const connection = await getPool();
    const {
      id_complejo,
      nombre_cancha,
      tipo_cancha,
      precio,
      superficie,
      estado,
    } = req.body || {};

    const complejoId = Number(id_complejo || 0);

    if (!complejoId) {
      return res
        .status(400)
        .json({ ok: false, message: "ID de complejo inválido." });
    }

    const [result] = await connection.query(
      `INSERT INTO canchas (id_complejo, nombre_cancha, tipo_cancha, precio, superficie, estado)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        complejoId,
        nombre_cancha || "Cancha nueva",
        tipo_cancha || "Futbol 5",
        Number(precio || 0),
        superficie || null,
        estado || "Disponible",
      ],
    );

    const [rows] = await connection.query(
      `SELECT id_cancha, id_complejo, nombre_cancha, tipo_cancha, precio, superficie, estado
       FROM canchas
       WHERE id_cancha = ?`,
      [result.insertId],
    );

    return res.json({ ok: true, cancha: rows[0] || null });
  } catch (error) {
    console.error("Error en POST /api/canchas:", error);
    return res
      .status(500)
      .json({ ok: false, message: "No se pudo crear la cancha." });
  }
});

app.delete("/api/canchas/:id_cancha", async (req, res) => {
  try {
    const connection = await getPool();
    const idCancha = Number(req.params.id_cancha || 0);

    if (!idCancha) {
      return res
        .status(400)
        .json({ ok: false, message: "ID de cancha inválido." });
    }

    await connection.query("DELETE FROM horarios_cancha WHERE id_cancha = ?", [
      idCancha,
    ]);
    await connection.query("DELETE FROM canchas WHERE id_cancha = ?", [
      idCancha,
    ]);

    return res.json({ ok: true, message: "Cancha eliminada correctamente." });
  } catch (error) {
    console.error("Error en DELETE /api/canchas/:id_cancha:", error);
    return res
      .status(500)
      .json({ ok: false, message: "No se pudo eliminar la cancha." });
  }
});

app.patch("/api/canchas/:id_cancha", async (req, res) => {
  try {
    const connection = await getPool();
    const idCancha = Number(req.params.id_cancha || 0);
    const { nombre_cancha, tipo_cancha, precio, superficie, estado } =
      req.body || {};

    if (!idCancha) {
      return res
        .status(400)
        .json({ ok: false, message: "ID de cancha inválido." });
    }

    await connection.query(
      `UPDATE canchas
       SET nombre_cancha = COALESCE(?, nombre_cancha),
           tipo_cancha = COALESCE(?, tipo_cancha),
           precio = COALESCE(?, precio),
           superficie = COALESCE(?, superficie),
           estado = COALESCE(?, estado)
       WHERE id_cancha = ?`,
      [
        nombre_cancha ?? null,
        tipo_cancha ?? null,
        precio ?? null,
        superficie ?? null,
        estado ?? null,
        idCancha,
      ],
    );

    return res.json({ ok: true, message: "Cancha actualizada correctamente." });
  } catch (error) {
    console.error("Error en PATCH /api/canchas/:id_cancha:", error);
    return res
      .status(500)
      .json({ ok: false, message: "No se pudo actualizar la cancha." });
  }
});

app.put("/api/horarios/cancha/:id_cancha", async (req, res) => {
  try {
    const connection = await getPool();
    const idCancha = Number(req.params.id_cancha || 0);
    const horarios = Array.isArray(req.body?.horarios) ? req.body.horarios : [];

    if (!idCancha) {
      return res
        .status(400)
        .json({ ok: false, message: "ID de cancha inválido." });
    }

    await connection.query("DELETE FROM horarios_cancha WHERE id_cancha = ?", [
      idCancha,
    ]);

    if (horarios.length > 0) {
      await Promise.all(
        horarios.map((item) =>
          connection.query(
            "INSERT INTO horarios_cancha (id_cancha, dia_semana, hora_apertura, hora_cierre) VALUES (?, ?, ?, ?)",
            [
              idCancha,
              item.dia_semana,
              item.hora_apertura || "08:00:00",
              item.hora_cierre || "20:00:00",
            ],
          ),
        ),
      );
    }

    return res.json({
      ok: true,
      message: "Horarios actualizados correctamente.",
    });
  } catch (error) {
    console.error("Error en PUT /api/horarios/cancha/:id_cancha:", error);
    return res
      .status(500)
      .json({ ok: false, message: "No se pudieron actualizar los horarios." });
  }
});

app.post(
  "/api/imagenes-cancha/:id_cancha",
  upload.single("photo"),
  async (req, res) => {
    try {
      const connection = await getPool();
      const idCancha = Number(req.params.id_cancha || 0);
      const uploadedFile = req.file;
      const { url_imagen } = req.body || {};

      const normalizeRemoteUrl = (value) =>
        String(value || "")
          .trim()
          .replace(/\\/g, "/")
          .replace(/https:\/\/(?!\/)/gi, "https://")
          .replace(/http:\/\/(?!\/)/gi, "http://");

      const remoteCandidate = normalizeRemoteUrl(
        uploadedFile?.secure_url ||
          uploadedFile?.url ||
          uploadedFile?.path ||
          url_imagen,
      );
      const hasRemoteUrl = /^https?:\/\//i.test(remoteCandidate);

      const localFilePath =
        uploadedFile?.path && !hasRemoteUrl
          ? `${req.protocol}://${req.get("host")}/${path
              .relative(__dirname, String(uploadedFile.path))
              .replace(/\\/g, "/")}`
          : null;

      const publicImageUrl = hasRemoteUrl ? remoteCandidate : localFilePath;

      if (!idCancha || !publicImageUrl) {
        return res.status(400).json({
          ok: false,
          message: "Faltan datos para subir la imagen de la cancha.",
        });
      }

      await connection.query(
        "DELETE FROM imagenes_cancha WHERE id_cancha = ?",
        [idCancha],
      );
      await connection.query(
        "INSERT INTO imagenes_cancha (id_cancha, url_imagen, descripcion, fecha_subida) VALUES (?, ?, ?, NOW())",
        [idCancha, publicImageUrl, "Foto subida desde la galería"],
      );

      return res.json({
        ok: true,
        imageUrl: publicImageUrl,
        message: "Imagen actualizada correctamente.",
      });
    } catch (error) {
      console.error("Error en POST /api/imagenes-cancha/:id_cancha:", error);
      return res
        .status(500)
        .json({ ok: false, message: "No se pudo actualizar la imagen." });
    }
  },
);

app.get("/api/canchas", async (req, res) => {
  try {
    const connection = await getPool();
    const [rows] = await connection.query(
      `SELECT
         c.id_cancha,
         c.id_complejo,
         co.id_usuario AS id_gerente,
         co.nombre_complejo,
         c.nombre_cancha,
         co.direccion AS direccion_cancha,
         co.descripcion AS descripcion_complejo,
         co.valoracion,
         COALESCE(co.latitud, 0) AS latitud,
         COALESCE(co.longitud, 0) AS longitud,
         c.precio,
         c.superficie,
         c.tipo_cancha,
         c.estado,
         NULL AS capacidad,
         COALESCE(
           (
             SELECT GROUP_CONCAT(
               CONCAT(hc.dia_semana, '-', hc.hora_apertura, 'a', hc.hora_cierre)
               SEPARATOR ';'
             )
             FROM horarios_cancha hc
             WHERE hc.id_cancha = c.id_cancha
           ),
           ''
         ) AS horario,
         COALESCE(
           (
             SELECT ic.url_imagen
             FROM imagenes_cancha ic
             WHERE ic.id_cancha = c.id_cancha
             ORDER BY ic.id_imagen
             LIMIT 1
           ),
           ''
         ) AS imagen_url
       FROM canchas c
       INNER JOIN complejos co ON co.id_complejo = c.id_complejo
       WHERE c.estado = 'Disponible'
       ORDER BY c.id_cancha ASC`,
    );

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const canchas = rows.map((field) => {
      const imagenUrl = field.imagen_url;
      const description = String(
        field.descripcion_complejo || "",
      ).toLowerCase();
      const servicios = [
        "parqueadero",
        "vestidores",
        "baños",
        "cafeteria",
        "tienda",
      ]
        .filter((item) => description.includes(item))
        .join(", ");

      return {
        ...field,
        servicios,
        imagen_url:
          imagenUrl && !/^https?:\/\//i.test(imagenUrl)
            ? `${baseUrl}${imagenUrl.startsWith("/") ? imagenUrl : `/${imagenUrl}`}`
            : imagenUrl || null,
      };
    });

    return res.json({ ok: true, canchas });
  } catch (error) {
    console.error("Error en /api/canchas:", error);
    return res
      .status(500)
      .json({ ok: false, message: "No se pudieron cargar las canchas." });
  }
});

app.post("/api/register", async (req, res) => {
  try {
    const { name, documentNumber, email, phone, password } = req.body || {};

    if (!name || !documentNumber || !email || !phone || !password) {
      return res
        .status(400)
        .json({ ok: false, message: "Todos los campos son obligatorios." });
    }

    const connection = await getPool();
    const hashedPassword = await bcrypt.hash(password, 10);

    await connection.query(
      "INSERT INTO deportistas (nombre_deportista, cedula_deportista, correo, contrasena, telefono) VALUES (?, ?, ?, ?, ?)",
      [
        name.trim(),
        documentNumber.trim(),
        email.trim().toLowerCase(),
        hashedPassword,
        phone.trim(),
      ],
    );

    return res
      .status(201)
      .json({ ok: true, message: "Usuario registrado correctamente." });
  } catch (error) {
    console.error("Error en /api/register:", error);

    if (error && error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        ok: false,
        message: "El correo o la cédula ya están registrados.",
      });
    }

    return res
      .status(500)
      .json({ ok: false, message: "No se pudo registrar el usuario." });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};

  try {
    if (!email || !password) {
      return res
        .status(400)
        .json({ ok: false, message: "Correo y contraseña son obligatorios." });
    }

    const connection = await getPool();
    const normalizedEmail = String(email).trim().toLowerCase();

    let user = null;
    let source = "deportistas";

    const [deportistaRows] = await connection.query(
      "SELECT * FROM deportistas WHERE correo = ? LIMIT 1",
      [normalizedEmail],
    );

    if (deportistaRows.length > 0) {
      user = deportistaRows[0];
      source = "deportistas";
    } else {
      const [adminRows] = await connection.query(
        "SELECT * FROM administradores_gerentes WHERE correo = ? LIMIT 1",
        [normalizedEmail],
      );

      if (adminRows.length > 0) {
        user = adminRows[0];
        source = "administradores_gerentes";
      }
    }

    if (!user) {
      const fallbackUser = await authenticateFallbackUser(email, password);

      if (fallbackUser) {
        return res.json({
          ok: true,
          message: "Inicio de sesión correcto.",
          user: {
            id: fallbackUser.id,
            name: fallbackUser.name,
            email: fallbackUser.email,
            phone: fallbackUser.phone,
            role: fallbackUser.role || "deportista",
            foto_perfil: fallbackUser.foto_perfil || null,
            foto_perfil: fallbackUser.foto_perfil || null,
            source: fallbackUser.source || "fallback",
          },
        });
      }

      return res
        .status(401)
        .json({ ok: false, message: "Correo o contraseña inválidos." });
    }

    const storedPassword = String(user.contrasena || "");
    const isHashedPassword = storedPassword.startsWith("$2");
    const passwordMatches = isHashedPassword
      ? await bcrypt.compare(password, storedPassword)
      : storedPassword === String(password);

    if (!passwordMatches) {
      return res
        .status(401)
        .json({ ok: false, message: "Correo o contraseña inválidos." });
    }

    if (!isHashedPassword) {
      const newHashedPassword = await bcrypt.hash(String(password), 10);
      if (source === "administradores_gerentes") {
        await connection.query(
          "UPDATE administradores_gerentes SET contrasena = ? WHERE id_usuario = ?",
          [newHashedPassword, user.id_usuario],
        );
      } else {
        await connection.query(
          "UPDATE deportistas SET contrasena = ? WHERE id_deportista = ?",
          [newHashedPassword, user.id_deportista],
        );
      }
    }

    const userPayload =
      source === "administradores_gerentes"
        ? {
            id: user.id_usuario,
            name: user.nombre,
            email: user.correo,
            phone: user.telefono,
            role: user.rol || "gerente",
            foto_perfil: user.foto_perfil || null,
            source,
          }
        : {
            id: user.id_deportista,
            name: user.nombre_deportista,
            email: user.correo,
            phone: user.telefono,
            role: "deportista",
            foto_perfil: user.foto_perfil || null,
            source,
          };

    return res.json({
      ok: true,
      message: "Inicio de sesión correcto.",
      user: userPayload,
    });
  } catch (error) {
    console.warn(
      "Login DB falló, intentando respaldo local:",
      error?.code || error?.message || error,
    );

    const fallbackUser = await authenticateFallbackUser(email, password);

    if (fallbackUser) {
      return res.json({
        ok: true,
        message: "Inicio de sesión correcto.",
        user: {
          id: fallbackUser.id,
          name: fallbackUser.name,
          email: fallbackUser.email,
          phone: fallbackUser.phone,
          role: fallbackUser.role || "deportista",
          source: fallbackUser.source || "fallback",
        },
      });
    }

    return res.status(401).json({
      ok: false,
      message:
        "Correo o contraseña inválidos o la base de datos no está disponible.",
    });
  }
});

app.listen(PORT, HOST, async () => {
  try {
    const connection = await getPool();
    await ensureNotificationColumns(connection);
    await ensureFavoritesTable(connection);
    console.log(`API de CanchaYa ejecutándose en http://${HOST}:${PORT}`);
  } catch (error) {
    console.error(
      "No se pudieron preparar las columnas de notificación:",
      error,
    );
    console.log(`API de CanchaYa ejecutándose en http://${HOST}:${PORT}`);
  }
});
