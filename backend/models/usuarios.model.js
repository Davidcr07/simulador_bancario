const { pool } = require('../config/db');

/**
 * MODELO: Usuario (Tabla `usuarios`)
 * Atributos principales: id, documento, nombre_completo, correo, telefono,
 *                        direccion, password_hash, rol, estado, fecha_creacion
 */

async function buscarPorIdentificador(identificador) {
  const [rows] = await pool.query(
    `SELECT 
        u.id,
        u.documento,
        u.nombre_completo,
        u.correo,
        u.telefono,
        u.direccion,
        u.password_hash,
        u.rol,
        u.estado,
        u.fecha_creacion,
        c.id AS cuenta_id,
        c.numero_cuenta,
        c.tipo_cuenta,
        c.estado AS estado_cuenta
     FROM usuarios u
     LEFT JOIN cuentas c ON c.usuario_id = u.id
     WHERE u.correo = ? OR u.documento = ?
     LIMIT 1`,
    [identificador, identificador]
  );
  return rows[0] || null;
}

async function buscarPorId(id) {
  const [rows] = await pool.query(
    `SELECT 
        u.id,
        u.documento,
        u.nombre_completo,
        u.correo,
        u.telefono,
        u.direccion,
        u.rol,
        u.estado,
        u.fecha_creacion,
        c.id AS cuenta_id,
        c.numero_cuenta,
        c.tipo_cuenta,
        c.saldo,
        c.estado AS estado_cuenta,
        c.fecha_apertura
     FROM usuarios u
     LEFT JOIN cuentas c ON c.usuario_id = u.id
     WHERE u.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function buscarConPasswordPorId(id) {
  const [rows] = await pool.query(
    'SELECT id, correo, password_hash, estado FROM usuarios WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function existeCorreoEnOtroUsuario(correo, usuarioIdActual) {
  const [rows] = await pool.query(
    'SELECT id FROM usuarios WHERE correo = ? AND id <> ? LIMIT 1',
    [correo, usuarioIdActual]
  );
  return rows.length > 0;
}

async function existeDocumentoOCorreo(documento, correo) {
  const [rows] = await pool.query(
    'SELECT id, documento, correo FROM usuarios WHERE documento = ? OR correo = ? LIMIT 1',
    [documento, correo]
  );
  return rows[0] || null;
}

async function actualizarPerfil(usuarioId, { nombre_completo, correo, telefono, direccion }) {
  await pool.query(
    `UPDATE usuarios
     SET nombre_completo = ?,
         correo = ?,
         telefono = ?,
         direccion = ?
     WHERE id = ?`,
    [nombre_completo, correo, telefono || null, direccion || null, usuarioId]
  );
}

async function actualizarPassword(usuarioId, nuevoPasswordHash) {
  await pool.query(
    'UPDATE usuarios SET password_hash = ? WHERE id = ?',
    [nuevoPasswordHash, usuarioId]
  );
}

/**
 * Obtiene las métricas de clientes para el Dashboard Administrativo.
 */
async function obtenerMetricasClientes() {
  const [rows] = await pool.query(
    `SELECT
        COUNT(*) AS total_clientes,
        SUM(CASE WHEN estado = 'ACTIVO' THEN 1 ELSE 0 END) AS clientes_activos,
        SUM(CASE WHEN estado = 'INACTIVO' THEN 1 ELSE 0 END) AS clientes_inactivos,
        SUM(CASE WHEN estado = 'BLOQUEADO' THEN 1 ELSE 0 END) AS clientes_bloqueados
     FROM usuarios
     WHERE rol = 'CLIENTE'`
  );
  return rows[0];
}

/**
 * Lista todos los clientes del banco con su información de cuenta, permitiendo búsqueda.
 */
async function listarClientes(busqueda = '') {
  let sql = `
    SELECT
      u.id,
      u.documento,
      u.nombre_completo,
      u.correo,
      u.telefono,
      u.direccion,
      u.rol,
      u.estado,
      u.fecha_creacion,
      c.id AS cuenta_id,
      c.numero_cuenta,
      c.tipo_cuenta,
      c.saldo,
      c.estado AS estado_cuenta,
      c.fecha_apertura
    FROM usuarios u
    LEFT JOIN cuentas c ON c.usuario_id = u.id
    WHERE u.rol = 'CLIENTE'
  `;
  const params = [];

  if (busqueda && String(busqueda).trim() !== '') {
    const patron = `%${String(busqueda).trim()}%`;
    sql += ` AND (u.nombre_completo LIKE ? OR u.documento LIKE ? OR u.correo LIKE ? OR c.numero_cuenta LIKE ?)`;
    params.push(patron, patron, patron, patron);
  }

  sql += ' ORDER BY u.id DESC';

  const [rows] = await pool.query(sql, params);
  return rows;
}

/**
 * Crea un nuevo usuario dentro de una transacción SQL activa.
 */
async function crearEnTransaccion(
  connection,
  { documento, nombre_completo, correo, telefono, direccion, password_hash, rol = 'CLIENTE', estado = 'ACTIVO' }
) {
  const [result] = await connection.query(
    `INSERT INTO usuarios (documento, nombre_completo, correo, telefono, direccion, password_hash, rol, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [documento, nombre_completo, correo, telefono || null, direccion || null, password_hash, rol, estado]
  );
  return result.insertId;
}

/**
 * Actualiza el estado de un usuario dentro de una transacción activa.
 */
async function actualizarEstadoEnTransaccion(connection, usuarioId, nuevoEstado) {
  await connection.query(
    'UPDATE usuarios SET estado = ? WHERE id = ?',
    [nuevoEstado, usuarioId]
  );
}

module.exports = {
  buscarPorIdentificador,
  buscarPorId,
  buscarConPasswordPorId,
  existeCorreoEnOtroUsuario,
  existeDocumentoOCorreo,
  actualizarPerfil,
  actualizarPassword,
  obtenerMetricasClientes,
  listarClientes,
  crearEnTransaccion,
  actualizarEstadoEnTransaccion
};
