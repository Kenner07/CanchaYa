const fetch = global.fetch;

async function ensureNotificationColumns(connection) {
  const statements = [
    "ALTER TABLE deportistas ADD COLUMN IF NOT EXISTS expo_push_token VARCHAR(255) NULL",
    "ALTER TABLE administradores_gerentes ADD COLUMN IF NOT EXISTS expo_push_token VARCHAR(255) NULL",
  ];

  for (const statement of statements) {
    try {
      await connection.query(statement);
    } catch (error) {
      if (error && error.code !== "ER_DUP_FIELD") {
        throw error;
      }
    }
  }
}

async function savePushToken(connection, table, idColumn, idValue, token) {
  if (!token) return null;

  await connection.query(
    `UPDATE ${table} SET expo_push_token = ? WHERE ${idColumn} = ?`,
    [token, idValue],
  );

  return token;
}

async function sendExpoPushNotification(token, title, body, data = {}) {
  if (!token) {
    return { ok: false, message: "No hay token de notificación disponible." };
  }

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        to: token,
        sound: "default",
        title,
        body,
        data,
      }),
    });

    const result = await response.json();

    return { ok: response.ok, status: response.status, result };
  } catch (error) {
    console.error("Error al enviar notificación push:", error);
    return { ok: false, message: error.message || "No se pudo enviar la notificación." };
  }
}

module.exports = {
  ensureNotificationColumns,
  savePushToken,
  sendExpoPushNotification,
};
