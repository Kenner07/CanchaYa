# CanchaYa

CanchaYa es una aplicacion movil para buscar, consultar y reservar canchas deportivas. El proyecto combina una app Expo/React Native con una API Node.js/Express conectada a MySQL.

## Funcionalidades principales

- Registro e inicio de sesion de deportistas.
- Inicio de sesion para administradores o gerentes.
- Listado de canchas cercanas con mapa.
- Vista de detalle de cancha con precio, ubicacion, horarios e imagen.
- Consulta de disponibilidad por fecha.
- Creacion de reservas por bloques horarios.
- Panel de administracion para ver canchas asignadas.
- Aprobacion o rechazo de reservas por parte del gerente.
- Registro y envio de notificaciones push con Expo.

## Tecnologias

- Expo
- React Native
- Expo Router
- Node.js
- Express
- MySQL
- Expo Notifications

## Requisitos

- Node.js instalado.
- MySQL o XAMPP corriendo.
- Base de datos `busqueda_canchas` creada con las tablas esperadas por la API.
- Dependencias instaladas con `npm install`.

## Configuracion de base de datos

La conexion se configura en `config/db.js`.

Valores por defecto:

```txt
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=busqueda_canchas
```

Puedes sobrescribirlos usando variables de entorno.

## Como ejecutar

Instalar dependencias:

```bash
npm install
```

Levantar la API:

```bash
npm run server
```

Levantar la app Expo:

```bash
npm start
```

La API usa por defecto el puerto `3001`.

## Rutas principales de la API

- `GET /api/health`: verifica que la API este activa.
- `GET /api/canchas`: lista las canchas registradas.
- `POST /api/register`: registra un deportista.
- `POST /api/login`: inicia sesion.
- `GET /api/reservas/disponibilidad`: consulta horarios disponibles de una cancha.
- `POST /api/reservas`: crea una reserva.
- `GET /api/reservas/cancha/:id_cancha`: lista reservas de una cancha.
- `PATCH /api/reservas/:id_reserva/estado`: aprueba o rechaza una reserva.

## Estructura relevante

- `app/`: pantallas y rutas de la app movil.
- `app/(tabs)/index.tsx`: pantalla principal de canchas cercanas.
- `app/cancha-details.tsx`: detalle y reserva de cancha.
- `app/admin-home.tsx`: panel de administracion.
- `server.js`: entrada principal de la API.
- `controllers/reservasController.js`: logica de reservas.
- `routes/reservas.js`: rutas de reservas.
- `config/db.js`: conexion a MySQL.
- `utils/`: utilidades de API, sesion y notificaciones.
