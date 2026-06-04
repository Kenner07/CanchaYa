const mysql = require("mysql2/promise");

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "busqueda_canchas",
  });

  try {
    const [rows] = await conn.query("SHOW TABLES LIKE 'imagenes_cancha'");
    console.log(JSON.stringify({ exists: rows.length > 0, rows }, null, 2));

    if (rows.length > 0) {
      const [cols] = await conn.query("DESCRIBE imagenes_cancha");
      console.log("COLUMNS=" + JSON.stringify(cols, null, 2));
    }
  } finally {
    await conn.end();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
