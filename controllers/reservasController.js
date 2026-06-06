const { getPool } = require("../config/db");

function toMinutes(time) {
  const [hours, minutes] = String(time).split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTime(minutes) {
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
}

function getDayNameFromDate(fecha) {
  const date = new Date(`${fecha}T12:00:00`);
  return new Intl.DateTimeFormat("es-ES", { weekday: "long" })
    .format(date)
    .toLowerCase();
}

function normalizeDayName(value) {
  if (!value) return "";
  return String(value).trim().toLowerCase();
}

function buildTimeSlots(horaApertura, horaCierre) {
  const start = toMinutes(horaApertura);
  const end = toMinutes(horaCierre);
  const slots = [];

  for (let current = start; current + 60 <= end; current += 60) {
    slots.push({
      hora_inicio: formatTime(current),
      hora_fin: formatTime(current + 60),
    });
  }

  return slots;
}

function overlaps(slotStart, slotEnd, reserveStart, reserveEnd) {
  return slotStart < reserveEnd && reserveStart < slotEnd;
}

async function getHorarioCancha(idCancha, fecha) {
  const connection = await getPool();
  const diaSemana = getDayNameFromDate(fecha);

  const [rows] = await connection.query(
    `SELECT id_horario, id_cancha, dia_semana, hora_apertura, hora_cierre
     FROM horarios_cancha
     WHERE id_cancha = ? AND LOWER(dia_semana) = ?
     LIMIT 1`,
    [idCancha, diaSemana],
  );

  if (rows.length > 0) {
    return rows[0];
  }

  const [fallbackRows] = await connection.query(
    `SELECT id_horario, id_cancha, dia_semana, hora_apertura, hora_cierre
     FROM horarios_cancha
     WHERE id_cancha = ?
     ORDER BY id_horario ASC`,
    [idCancha],
  );

  return (
    fallbackRows.find(
      (row) => normalizeDayName(row.dia_semana) === diaSemana,
    ) || null
  );
}

async function getReservasDia(idCancha, fecha) {
  const connection = await getPool();

  const [rows] = await connection.query(
    `SELECT id_reserva, id_deportista, id_cancha, fecha, hora_inicio, hora_fin, precio_pagado, estado
     FROM reservas
     WHERE id_cancha = ?
       AND fecha = ?
       AND estado IN ('pendiente', 'confirmada')
     ORDER BY hora_inicio ASC`,
    [idCancha, fecha],
  );

  return rows;
}

async function listarHorariosDisponibles(req, res) {
  try {
    const idCancha = Number(req.query.id_cancha || req.query.id || 0);
    const fecha = String(req.query.fecha || "").trim();

    if (!idCancha || !fecha) {
      return res.status(400).json({
        ok: false,
        message: "Debe enviar id_cancha y fecha.",
      });
    }

    const connection = await getPool();
    const [canchaRows] = await connection.query(
      "SELECT id_cancha, nombre_cancha FROM canchas WHERE id_cancha = ? LIMIT 1",
      [idCancha],
    );

    if (canchaRows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "La cancha no existe.",
      });
    }

    const horario = await getHorarioCancha(idCancha, fecha);

    if (!horario) {
      return res.status(404).json({
        ok: false,
        message: "No existe horario de funcionamiento para esa fecha.",
      });
    }

    const reservas = await getReservasDia(idCancha, fecha);
    const bloques = buildTimeSlots(horario.hora_apertura, horario.hora_cierre);

    const bloquesConEstado = bloques.map((bloque) => {
      const slotStart = toMinutes(bloque.hora_inicio);
      const slotEnd = toMinutes(bloque.hora_fin);

      const ocupado = reservas.some((reserva) =>
        overlaps(
          slotStart,
          slotEnd,
          toMinutes(reserva.hora_inicio),
          toMinutes(reserva.hora_fin),
        ),
      );

      return {
        ...bloque,
        disponible: !ocupado,
        estado: ocupado ? "ocupado" : "disponible",
      };
    });

    return res.json({
      ok: true,
      cancha: {
        id_cancha: canchaRows[0].id_cancha,
        nombre_cancha: canchaRows[0].nombre_cancha,
      },
      fecha,
      dia_semana: normalizeDayName(horario.dia_semana),
      horario: {
        hora_apertura: horario.hora_apertura,
        hora_cierre: horario.hora_cierre,
      },
      bloques: bloquesConEstado,
    });
  } catch (error) {
    console.error("Error al listar horarios disponibles:", error);
    return res.status(500).json({
      ok: false,
      message: "No se pudo consultar la disponibilidad de la cancha.",
    });
  }
}

async function listarReservasPorCancha(req, res) {
  try {
    const idCancha = Number(req.params.id_cancha || 0);

    if (!idCancha) {
      return res.status(400).json({
        ok: false,
        message: "Debe enviar el id de la cancha.",
      });
    }

    const connection = await getPool();

    const [canchaRows] = await connection.query(
      "SELECT id_cancha FROM canchas WHERE id_cancha = ? LIMIT 1",
      [idCancha],
    );

    if (canchaRows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "La cancha no existe.",
      });
    }

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
         d.nombre_deportista,
         d.correo,
         d.telefono
       FROM reservas r
       LEFT JOIN deportistas d ON d.id_deportista = r.id_deportista
       WHERE r.id_cancha = ?
       ORDER BY r.fecha DESC, r.hora_inicio ASC`,
      [idCancha],
    );

    return res.json({
      ok: true,
      cancha_id: idCancha,
      reservas: rows,
    });
  } catch (error) {
    console.error("Error al listar reservas por cancha:", error);
    return res.status(500).json({
      ok: false,
      message: "No se pudieron cargar las reservas de la cancha.",
    });
  }
}

async function actualizarEstadoReserva(req, res) {
  try {
    const idReserva = Number(req.params.id_reserva || 0);
    const { estado, id_gerente } = req.body || {};

    if (!idReserva) {
      return res
        .status(400)
        .json({ ok: false, message: "Debe indicar la reserva." });
    }

    const allowedStates = ["confirmada", "rechazada"];
    if (!allowedStates.includes(String(estado || ""))) {
      return res.status(400).json({ ok: false, message: "Estado inválido." });
    }

    const connection = await getPool();

    const [reservaRows] = await connection.query(
      `SELECT r.id_reserva, r.id_cancha, r.estado, c.id_gerente
       FROM reservas r
       LEFT JOIN canchas c ON c.id_cancha = r.id_cancha
       WHERE r.id_reserva = ?
       LIMIT 1`,
      [idReserva],
    );

    if (reservaRows.length === 0) {
      return res
        .status(404)
        .json({ ok: false, message: "La reserva no existe." });
    }

    const reserva = reservaRows[0];

    if (Number(id_gerente || 0) !== Number(reserva.id_gerente || 0)) {
      return res.status(403).json({
        ok: false,
        message:
          "Solo el gerente asignado a la cancha puede aprobar o rechazar esta reserva.",
      });
    }

    await connection.query(
      `UPDATE reservas
       SET estado = ?
       WHERE id_reserva = ?`,
      [estado, idReserva],
    );

    return res.json({
      ok: true,
      message:
        estado === "confirmada" ? "Reserva aprobada." : "Reserva rechazada.",
      reserva: {
        id_reserva: idReserva,
        estado,
      },
    });
  } catch (error) {
    console.error("Error al actualizar el estado de la reserva:", error);
    return res.status(500).json({
      ok: false,
      message: "No se pudo actualizar el estado de la reserva.",
    });
  }
}

async function crearReserva(req, res) {
  try {
    const {
      id_deportista,
      id_cancha,
      fecha,
      hora_inicio,
      hora_fin,
      precio_pagado = 0,
      estado = "pendiente",
    } = req.body || {};

    if (!id_deportista || !id_cancha || !fecha || !hora_inicio || !hora_fin) {
      return res.status(400).json({
        ok: false,
        message:
          "Los campos id_deportista, id_cancha, fecha, hora_inicio y hora_fin son obligatorios.",
      });
    }

    if (toMinutes(hora_fin) <= toMinutes(hora_inicio)) {
      return res.status(400).json({
        ok: false,
        message: "La hora de fin debe ser mayor que la hora de inicio.",
      });
    }

    const connection = await getPool();

    const [canchaRows] = await connection.query(
      "SELECT id_cancha FROM canchas WHERE id_cancha = ? LIMIT 1",
      [id_cancha],
    );

    if (canchaRows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "La cancha indicada no existe.",
      });
    }

    const horario = await getHorarioCancha(id_cancha, fecha);

    if (!horario) {
      return res.status(400).json({
        ok: false,
        message: "La cancha no tiene horario de funcionamiento para esa fecha.",
      });
    }

    const apertura = toMinutes(horario.hora_apertura);
    const cierre = toMinutes(horario.hora_cierre);
    const inicio = toMinutes(hora_inicio);
    const fin = toMinutes(hora_fin);

    if (inicio < apertura || fin > cierre) {
      return res.status(400).json({
        ok: false,
        message:
          "El horario solicitado está fuera del horario de funcionamiento de la cancha.",
      });
    }

    const [reservasSolapadas] = await connection.query(
      `SELECT id_reserva
       FROM reservas
       WHERE id_cancha = ?
         AND fecha = ?
         AND estado IN ('pendiente', 'confirmada')
         AND NOT (hora_fin <= ? OR hora_inicio >= ?)`,
      [id_cancha, fecha, hora_inicio, hora_fin],
    );

    if (reservasSolapadas.length > 0) {
      return res.status(409).json({
        ok: false,
        message: "El horario ya está ocupado por otra reserva.",
      });
    }

    const [result] = await connection.query(
      `INSERT INTO reservas (id_deportista, id_cancha, fecha, hora_inicio, hora_fin, precio_pagado, estado, fecha_creacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id_deportista,
        id_cancha,
        fecha,
        hora_inicio,
        hora_fin,
        precio_pagado,
        estado,
      ],
    );

    return res.status(201).json({
      ok: true,
      message: "Reserva creada correctamente.",
      reserva: {
        id_reserva: result.insertId,
        id_deportista,
        id_cancha,
        fecha,
        hora_inicio,
        hora_fin,
        precio_pagado,
        estado,
      },
    });
  } catch (error) {
    console.error("Error al crear reserva:", error);
    return res.status(500).json({
      ok: false,
      message: "No se pudo crear la reserva.",
    });
  }
}

module.exports = {
  listarHorariosDisponibles,
  listarReservasPorCancha,
  crearReserva,
  actualizarEstadoReserva,
};
