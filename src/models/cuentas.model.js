const { pool } = require('../config/db');

/**
 * Busca una cuenta bancaria por su número de cuenta junto con los datos del titular.
 */
async function buscarPorNumeroCuenta(numeroCuenta) {
  const [rows] = await pool.query(
    `SELECT 
        c.id,
        c.usuario_id,
        c.numero_cuenta,
        c.tipo_cuenta,
        c.saldo,
        c.pin_hash,
        c.estado AS estado_cuenta,
        c.fecha_apertura,
        u.nombre_completo AS titular_nombre,
        u.documento AS titular_documento,
        u.correo AS titular_correo,
        u.estado AS estado_usuario
     FROM cuentas c
     INNER JOIN usuarios u ON u.id = c.usuario_id
     WHERE c.numero_cuenta = ?
     LIMIT 1`,
    [numeroCuenta]
  );
  return rows[0] || null;
}

/**
 * Busca una cuenta bancaria por su ID primario (para verificación de sesión en cajero/cliente).
 */
async function buscarPorId(cuentaId) {
  const [rows] = await pool.query(
    `SELECT 
        c.id,
        c.usuario_id,
        c.numero_cuenta,
        c.tipo_cuenta,
        c.saldo,
        c.estado AS estado_cuenta,
        c.fecha_apertura,
        u.nombre_completo AS titular_nombre,
        u.documento AS titular_documento,
        u.estado AS estado_usuario
     FROM cuentas c
     INNER JOIN usuarios u ON u.id = c.usuario_id
     WHERE c.id = ?
     LIMIT 1`,
    [cuentaId]
  );
  return rows[0] || null;
}

module.exports = {
  buscarPorNumeroCuenta,
  buscarPorId
};
