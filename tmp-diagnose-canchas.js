const { getPool } = require("./config/db");

(async () => {
  const conn = await getPool();
  try {
    const sql = `
      SELECT
        c.id_cancha,
        co.id_usuario AS id_gerente,
        c.nombre_cancha,
        co.direccion AS direccion_cancha,
        co.valoracion,
        co.latitud,
        co.longitud,
        c.precio,
        c.superficie,
        NULL AS capacidad,
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
      INNER JOIN complejos co ON co.id_complejo = c.id_complejo
      LEFT JOIN horarios_cancha h ON h.id_cancha = c.id_cancha
      GROUP BY c.id_cancha
      ORDER BY c.id_cancha ASC
    `;

    const [rows] = await conn.query(sql);
    console.log("ROWS", rows.length);
    console.log("FIRST", JSON.stringify(rows[0], null, 2));
  } catch (err) {
    console.error("ERR", err);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
})();
