const { pool } = require('../config/db');

/**
 * MODELO: Usuario (Tabla `usuarios`)
 * Atributos principales: id, documento, nombre_completo, correo, telefono,
 *                        direccion, password_hash, rol, estado, fecha_creacion
 */

/**
 * Busca un usuario por su correo electrónico o número de documento.
 * Incluye la información básica de su cuenta bancaria si es cliente.
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

/**
 * Busca un usuario por su ID primario junto con los datos de su cuenta bancaria.
 */
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

/**
 * Obtiene el usuario incluyendo su hash de contraseña (para validación de cambio de clave).
 */
async function buscarConPasswordPorId(id) {
  const [rows] = await pool.query(
    'SELECT id, correo, password_hash, estado FROM usuarios WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

/**
 * Verifica si un correo electrónico ya está registrado por otro usuario distinto.
 */
async function existeCorreoEnOtroUsuario(correo, usuarioIdActual) {
  const [rows] = await pool.query(
    'SELECT id FROM usuarios WHERE correo = ? AND id <> ? LIMIT 1',
    [correo, usuarioIdActual]
  );
  return rows.length > 0;
}

/**
 * Actualiza únicamente los datos permitidos del perfil del cliente.
 * Por regla de negocio NO modifica: saldo, número de cuenta, rol, estado ni documento.
 */
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

/**
 * Actualiza el hash de la contraseña de un usuario.
 */
async function actualizarPassword(usuarioId, nuevoPasswordHash) {
  await pool.query(
    'UPDATE usuarios SET password_hash = ? WHERE id = ?',
    [nuevoPasswordHash, usuarioId]
  );
}

module.exports = {
  buscarPorIdentificador,
  buscarPorId,
  buscarConPasswordPorId,
  existeCorreoEnOtroUsuario,
  actualizarPerfil,
  actualizarPassword
};
