const { pool } = require('../config/db');

/**
 * MODELO: Cuenta Bancaria (Tabla `cuentas`)
 * Atributos principales: id, usuario_id, numero_cuenta, tipo_cuenta, saldo, pin_hash, estado, fecha_apertura
 */

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
 * Busca una cuenta bancaria por su ID primario.
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

/**
 * Obtiene y bloquea (FOR UPDATE) el registro de una cuenta por su ID dentro de una transacción activa.
 */
async function obtenerPorIdParaTransaccion(connection, cuentaId) {
  const [rows] = await connection.query(
    `SELECT 
        c.id,
        c.usuario_id,
        c.numero_cuenta,
        c.tipo_cuenta,
        c.saldo,
        c.estado AS estado_cuenta,
        u.estado AS estado_usuario,
        u.nombre_completo AS titular_nombre
     FROM cuentas c
     INNER JOIN usuarios u ON u.id = c.usuario_id
     WHERE c.id = ?
     FOR UPDATE`,
    [cuentaId]
  );
  return rows[0] || null;
}

/**
 * Obtiene y bloquea (FOR UPDATE) el registro de una cuenta por su Número de Cuenta dentro de una transacción activa.
 */
async function obtenerPorNumeroParaTransaccion(connection, numeroCuenta) {
  const [rows] = await connection.query(
    `SELECT 
        c.id,
        c.usuario_id,
        c.numero_cuenta,
        c.tipo_cuenta,
        c.saldo,
        c.estado AS estado_cuenta,
        u.estado AS estado_usuario,
        u.nombre_completo AS titular_nombre
     FROM cuentas c
     INNER JOIN usuarios u ON u.id = c.usuario_id
     WHERE c.numero_cuenta = ?
     FOR UPDATE`,
    [numeroCuenta]
  );
  return rows[0] || null;
}

/**
 * Actualiza el saldo de una cuenta dentro de una transacción activa.
 */
async function actualizarSaldoEnTransaccion(connection, cuentaId, nuevoSaldo) {
  await connection.query(
    'UPDATE cuentas SET saldo = ? WHERE id = ?',
    [nuevoSaldo, cuentaId]
  );
}

module.exports = {
  buscarPorNumeroCuenta,
  buscarPorId,
  obtenerPorIdParaTransaccion,
  obtenerPorNumeroParaTransaccion,
  actualizarSaldoEnTransaccion
};
