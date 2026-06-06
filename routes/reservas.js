const express = require("express");
const {
  listarHorariosDisponibles,
  listarReservasPorCancha,
  crearReserva,
  actualizarEstadoReserva,
} = require("../controllers/reservasController");

const router = express.Router();

router.get("/disponibilidad", listarHorariosDisponibles);
router.get("/cancha/:id_cancha", listarReservasPorCancha);
router.post("/", crearReserva);
router.patch("/:id_reserva/estado", actualizarEstadoReserva);

module.exports = router;
