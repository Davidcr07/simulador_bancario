const { pool } = require('../config/db');

/**
 * MODELO: Movimiento Financiero (Tabla `movimientos`)
 * Atributos principales: id, cuenta_id, fecha, tipo_movimiento, descripcion, valor, saldo_resultante
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

async function crearEnTransaccion(connection, { cuenta_id, tipo_movimiento, descripcion, valor, saldo_resultante }) {
  const [result] = await connection.query(
    `INSERT INTO movimientos (cuenta_id, tipo_movimiento, descripcion, valor, saldo_resultante)
     VALUES (?, ?, ?, ?, ?)`,
    [cuenta_id, tipo_movimiento, descripcion, valor, saldo_resultante]
  );
  return result.insertId;
}

/**
 * Lista el historial general de movimientos de todo el banco para el Módulo Administrativo.
 */
async function listarTodos(tipoMovimiento = null, limite = 200) {
  let sql = `
    SELECT
      m.id,
      m.cuenta_id,
      m.fecha,
      m.tipo_movimiento,
      m.descripcion,
      m.valor,
      m.saldo_resultante,
      c.numero_cuenta,
      c.tipo_cuenta,
      u.nombre_completo AS titular_nombre,
      u.documento AS titular_documento
    FROM movimientos m
    INNER JOIN cuentas c ON c.id = m.cuenta_id
    INNER JOIN usuarios u ON u.id = c.usuario_id
  `;
  const params = [];

  if (tipoMovimiento && tipoMovimiento !== 'TODOS') {
    sql += ' WHERE m.tipo_movimiento = ?';
    params.push(tipoMovimiento);
  }

  sql += ' ORDER BY m.fecha DESC, m.id DESC LIMIT ?';
  params.push(Number(limite));

  const [rows] = await pool.query(sql, params);
  return rows;
}

module.exports = {
  listarPorCuenta,
  crearEnTransaccion,
  listarTodos
};
