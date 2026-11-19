const { pool } = require('../config/db');

/**
 * MODELO: Transferencia Bancaria (Tabla `transferencias`)
 * Atributos principales: id, cuenta_origen_id, cuenta_destino_id, valor, descripcion, fecha
 */

/**
 * Registra una transferencia entre cuentas dentro de una transacción SQL activa.
 */
async function crearEnTransaccion(connection, { cuenta_origen_id, cuenta_destino_id, valor, descripcion }) {
  const [result] = await connection.query(
    `INSERT INTO transferencias (cuenta_origen_id, cuenta_destino_id, valor, descripcion)
     VALUES (?, ?, ?, ?)`,
    [cuenta_origen_id, cuenta_destino_id, valor, descripcion]
  );
  return result.insertId;
}

/**
 * Lista las transferencias enviadas o recibidas por una cuenta específica.
 */
async function listarPorCuenta(cuentaId) {
  const [rows] = await pool.query(
    `SELECT 
        t.id,
        t.cuenta_origen_id,
        co.numero_cuenta AS numero_cuenta_origen,
        t.cuenta_destino_id,
        cd.numero_cuenta AS numero_cuenta_destino,
        t.valor,
        t.descripcion,
        t.fecha
     FROM transferencias t
     INNER JOIN cuentas co ON co.id = t.cuenta_origen_id
     INNER JOIN cuentas cd ON cd.id = t.cuenta_destino_id
     WHERE t.cuenta_origen_id = ? OR t.cuenta_destino_id = ?
     ORDER BY t.fecha DESC, t.id DESC`,
    [cuentaId, cuentaId]
  );
  return rows;
}

module.exports = {
  crearEnTransaccion,
  listarPorCuenta
};
