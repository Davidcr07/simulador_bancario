const { pool } = require('../config/db');

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
 * Busca un usuario por su ID primario (usado para validar sesiones activas en tiempo real).
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
        c.id AS cuenta_id,
        c.numero_cuenta,
        c.tipo_cuenta,
        c.saldo,
        c.estado AS estado_cuenta
     FROM usuarios u
     LEFT JOIN cuentas c ON c.usuario_id = u.id
     WHERE u.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

module.exports = {
  buscarPorIdentificador,
  buscarPorId
};
