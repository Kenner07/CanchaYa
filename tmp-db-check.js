const { getPool } = require("./config/db");

(async () => {
  const conn = await getPool();
  try {
    const [rows] = await conn.query(`
      SELECT
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
      ORDER BY c.id_cancha ASC
    `);

    console.log("ROWS", rows.length);
    console.log("FIRST", rows[0] || null);
  } catch (error) {
    console.error("ERR", error);
    process.exit(1);
  } finally {
    await conn.end();
  }
})();
