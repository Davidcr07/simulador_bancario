const { pool } = require('../config/db');

/**
 * MODELO: Movimiento Financiero (Tabla `movimientos`)
 * Atributos principales: id, cuenta_id, fecha, tipo_movimiento, descripcion, valor, saldo_resultante
 */

/**
 * Obtiene el historial de movimientos de una cuenta específica.
 */
async function listarPorCuenta(cuentaId, limite = null) {
  let sql = `
    SELECT 
      id,
      cuenta_id,
      fecha,
      tipo_movimiento,
      descripcion,
      valor,
      saldo_resultante
    FROM movimientos
    WHERE cuenta_id = ?
    ORDER BY fecha DESC, id DESC
  `;
  const params = [Number(cuentaId)];

  if (limite && Number(limite) > 0) {
    sql += ' LIMIT ?';
    params.push(Number(limite));
  }

  const [rows] = await pool.query(sql, params);
  return rows;
}

/**
 * Inserta un nuevo movimiento financiero dentro de una transacción SQL activa.
 */
async function crearEnTransaccion(connection, { cuenta_id, tipo_movimiento, descripcion, valor, saldo_resultante }) {
  const [result] = await connection.query(
    `INSERT INTO movimientos (cuenta_id, tipo_movimiento, descripcion, valor, saldo_resultante)
     VALUES (?, ?, ?, ?, ?)`,
    [cuenta_id, tipo_movimiento, descripcion, valor, saldo_resultante]
  );
  return result.insertId;
}

module.exports = {
  listarPorCuenta,
  crearEnTransaccion
};
