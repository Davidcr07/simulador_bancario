const { pool } = require('../config/db');

/**
 * MODELO: Cuenta Bancaria (Tabla `cuentas`)
 * Atributos principales: id, usuario_id, numero_cuenta, tipo_cuenta, saldo, pin_hash, estado, fecha_apertura
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

async function actualizarSaldoEnTransaccion(connection, cuentaId, nuevoSaldo) {
  await connection.query(
    'UPDATE cuentas SET saldo = ? WHERE id = ?',
    [nuevoSaldo, cuentaId]
  );
}

/**
 * Obtiene las métricas globales de las cuentas para el Dashboard Administrativo.
 */
async function obtenerMetricasCuentas() {
  const [rows] = await pool.query(
    `SELECT
        COUNT(*) AS total_cuentas,
        SUM(CASE WHEN estado = 'ACTIVO' THEN 1 ELSE 0 END) AS cuentas_activas,
        SUM(CASE WHEN estado = 'BLOQUEADO' THEN 1 ELSE 0 END) AS cuentas_bloqueadas,
        COALESCE(SUM(saldo), 0) AS suma_total_saldos
     FROM cuentas`
  );
  return rows[0];
}

/**
 * Lista todas las cuentas bancarias junto con la información de su titular.
 */
async function listarTodas() {
  const [rows] = await pool.query(
    `SELECT
        c.id,
        c.usuario_id,
        c.numero_cuenta,
        c.tipo_cuenta,
        c.saldo,
        c.estado,
        c.fecha_apertura,
        u.documento AS titular_documento,
        u.nombre_completo AS titular_nombre,
        u.correo AS titular_correo,
        u.estado AS titular_estado
     FROM cuentas c
     INNER JOIN usuarios u ON u.id = c.usuario_id
     ORDER BY c.id DESC`
  );
  return rows;
}

/**
 * Crea una nueva cuenta bancaria dentro de una transacción activa.
 */
async function crearEnTransaccion(
  connection,
  { usuario_id, numero_cuenta, tipo_cuenta = 'AHORROS', saldo = 0, pin_hash, estado = 'ACTIVO' }
) {
  const [result] = await connection.query(
    `INSERT INTO cuentas (usuario_id, numero_cuenta, tipo_cuenta, saldo, pin_hash, estado)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [usuario_id, numero_cuenta, tipo_cuenta, saldo, pin_hash, estado]
  );
  return result.insertId;
}

/**
 * Actualiza el estado de la cuenta de un usuario dentro de una transacción activa.
 */
async function actualizarEstadoPorUsuarioEnTransaccion(connection, usuarioId, nuevoEstado) {
  await connection.query(
    'UPDATE cuentas SET estado = ? WHERE usuario_id = ?',
    [nuevoEstado, usuarioId]
  );
}

/**
 * Actualiza el tipo de cuenta de un cliente.
 */
async function actualizarTipoPorUsuario(usuarioId, tipoCuenta) {
  await pool.query(
    'UPDATE cuentas SET tipo_cuenta = ? WHERE usuario_id = ?',
    [tipoCuenta, usuarioId]
  );
}

module.exports = {
  buscarPorNumeroCuenta,
  buscarPorId,
  obtenerPorIdParaTransaccion,
  obtenerPorNumeroParaTransaccion,
  actualizarSaldoEnTransaccion,
  obtenerMetricasCuentas,
  listarTodas,
  crearEnTransaccion,
  actualizarEstadoPorUsuarioEnTransaccion,
  actualizarTipoPorUsuario
};
