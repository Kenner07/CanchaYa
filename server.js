const path = require("path");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

const app = express();
const PORT = process.env.API_PORT || 3001;
const HOST = process.env.API_HOST || "0.0.0.0";

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "busqueda_canchas";

app.use(cors());
app.use(express.json());
app.use("/assets", express.static(path.join(__dirname, "assets")));

let pool;

async function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: "utf8mb4",
    });
  }

  return pool;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "API de CanchaYa activa" });
});

app.get("/api/canchas", async (req, res) => {
  try {
    const connection = await getPool();
    const [rows] = await connection.query(
      `SELECT
         c.id_cancha,
         c.id_gerente,
         c.nombre_cancha,
         c.direccion_cancha,
         c.valoracion,
         c.latitud,
         c.longitud,
         c.precio,
         c.superficie,
         c.capacidad,
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
         GROUP_CONCAT(
           CONCAT(h.dia_semana, ' ', TIME_FORMAT(h.hora_apertura, '%H:%i'), ' - ', TIME_FORMAT(h.hora_cierre, '%H:%i'))
           SEPARATOR '; '
         ) AS horario
       FROM canchas c
       LEFT JOIN horarios_cancha h ON h.id_cancha = c.id_cancha
       GROUP BY c.id_cancha
       ORDER BY c.id_cancha ASC`,
    );

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const canchas = rows.map((field) => {
      const imagenUrl = field.imagen_url;

      return {
        ...field,
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
  try {
    const { email, password } = req.body || {};

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
            source,
          }
        : {
            id: user.id_deportista,
            name: user.nombre_deportista,
            email: user.correo,
            phone: user.telefono,
            role: "deportista",
            source,
          };

    return res.json({
      ok: true,
      message: "Inicio de sesión correcto.",
      user: userPayload,
    });
  } catch (error) {
    console.error("Error en /api/login:", error);
    return res
      .status(500)
      .json({ ok: false, message: "No se pudo iniciar sesión." });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`API de CanchaYa ejecutándose en http://${HOST}:${PORT}`);
});
