const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

const app = express();
const PORT = process.env.API_PORT || 3001;

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "busqueda_canchas";

app.use(cors());
app.use(express.json());

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

app.get("/api/canchas", async (_req, res) => {
  try {
    const connection = await getPool();
    const [rows] = await connection.query(`
      SELECT
        c.id_cancha,
        c.nombre_cancha,
        c.direccion_cancha,
        c.valoracion,
        c.latitud,
        c.longitud,
        c.precio,
        c.superficie,
        c.capacidad,
        GROUP_CONCAT(
          CONCAT(h.dia_semana, ' ', TIME_FORMAT(h.hora_apertura, '%H:%i'), ' - ', TIME_FORMAT(h.hora_cierre, '%H:%i'))
          SEPARATOR '; '
        ) AS horario
      FROM canchas c
      LEFT JOIN horarios_cancha h ON h.id_cancha = c.id_cancha
      GROUP BY c.id_cancha
      ORDER BY c.id_cancha ASC
    `);

    return res.json({ ok: true, canchas: rows });
  } catch (error) {
    console.error("Error en /api/canchas:", error);
    return res.status(500).json({ ok: false, message: "No se pudieron cargar las canchas." });
  }
});

app.post("/api/register", async (req, res) => {
  try {
    const { name, documentNumber, email, phone, password } = req.body || {};

    if (!name || !documentNumber || !email || !phone || !password) {
      return res.status(400).json({ ok: false, message: "Todos los campos son obligatorios." });
    }

    const connection = await getPool();
    const hashedPassword = await bcrypt.hash(password, 10);

    await connection.query(
      "INSERT INTO deportistas (nombre_deportista, cedula_deportista, correo, contrasena, telefono) VALUES (?, ?, ?, ?, ?)",
      [name.trim(), documentNumber.trim(), email.trim().toLowerCase(), hashedPassword, phone.trim()],
    );

    return res.status(201).json({ ok: true, message: "Usuario registrado correctamente." });
  } catch (error) {
    console.error("Error en /api/register:", error);

    if (error && error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ ok: false, message: "El correo o la cédula ya están registrados." });
    }

    return res.status(500).json({ ok: false, message: "No se pudo registrar el usuario." });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ ok: false, message: "Correo y contraseña son obligatorios." });
    }

    const connection = await getPool();
    const [rows] = await connection.query("SELECT * FROM deportistas WHERE correo = ? LIMIT 1", [email.trim().toLowerCase()]);

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ ok: false, message: "Correo o contraseña inválidos." });
    }

    const passwordMatches = await bcrypt.compare(password, user.contrasena);
    if (!passwordMatches) {
      return res.status(401).json({ ok: false, message: "Correo o contraseña inválidos." });
    }

    return res.json({
      ok: true,
      message: "Inicio de sesión correcto.",
      user: {
        id: user.id_deportista,
        name: user.nombre_deportista,
        email: user.correo,
        phone: user.telefono,
      },
    });
  } catch (error) {
    console.error("Error en /api/login:", error);
    return res.status(500).json({ ok: false, message: "No se pudo iniciar sesión." });
  }
});

app.listen(PORT, () => {
  console.log(`API de CanchaYa ejecutándose en http://localhost:${PORT}`);
});
