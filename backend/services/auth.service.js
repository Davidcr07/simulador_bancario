const bcrypt = require('bcryptjs');
const UsuariosModel = require('../models/usuarios.model');
const CuentasModel = require('../models/cuentas.model');

/**
 * SERVICIO DE AUTENTICACIÓN ("El Cocinero")
 * Contiene toda la lógica de negocio para validar credenciales, encriptación,
 * roles y estados de cuenta antes de autorizar el acceso.
 */

/**
 * Valida las credenciales de un Cliente o Administrador.
 */
async function autenticarUsuario({ identificador, password, rolEsperado }) {
  if (!identificador || !password) {
    const error = new Error('Por favor ingrese su correo/documento y contraseña.');
    error.statusCode = 400;
    throw error;
  }

  const usuario = await UsuariosModel.buscarPorIdentificador(String(identificador).trim());

  if (!usuario) {
    const error = new Error('Credenciales incorrectas. Verifique sus datos e intente nuevamente.');
    error.statusCode = 401;
    throw error;
  }

  if (rolEsperado && usuario.rol !== rolEsperado) {
    const error = new Error(
      rolEsperado === 'ADMIN'
        ? 'Acceso denegado: esta cuenta no tiene privilegios de Administrador.'
        : 'Acceso denegado: los administradores deben ingresar por la Consola Corporativa.'
    );
    error.statusCode = 403;
    throw error;
  }

  const passwordValido = await bcrypt.compare(String(password), usuario.password_hash);
  if (!passwordValido) {
    const error = new Error('Credenciales incorrectas. Verifique sus datos e intente nuevamente.');
    error.statusCode = 401;
    throw error;
  }

  if (usuario.estado !== 'ACTIVO') {
    const error = new Error(`Acceso denegado: su usuario se encuentra en estado ${usuario.estado}. Contacte al banco.`);
    error.statusCode = 403;
    throw error;
  }

  if (usuario.rol === 'CLIENTE' && usuario.estado_cuenta && usuario.estado_cuenta !== 'ACTIVO') {
    const error = new Error(
      `Acceso denegado: su cuenta bancaria (#${usuario.numero_cuenta}) está en estado ${usuario.estado_cuenta}.`
    );
    error.statusCode = 403;
    throw error;
  }

  return {
    id: usuario.id,
    documento: usuario.documento,
    nombre_completo: usuario.nombre_completo,
    correo: usuario.correo,
    rol: usuario.rol,
    estado: usuario.estado,
    cuenta_id: usuario.cuenta_id || null,
    numero_cuenta: usuario.numero_cuenta || null,
    tipo_cuenta: usuario.tipo_cuenta || null
  };
}

/**
 * Valida el Número de Cuenta y PIN para el Cajero Automático Virtual.
 */
async function autenticarCajero({ numero_cuenta, pin }) {
  if (!numero_cuenta || !pin) {
    const error = new Error('Debe ingresar el número de cuenta y el PIN.');
    error.statusCode = 400;
    throw error;
  }

  const cuenta = await CuentasModel.buscarPorNumeroCuenta(String(numero_cuenta).trim());

  if (!cuenta) {
    const error = new Error('La cuenta ingresada no existe en el sistema.');
    error.statusCode = 404;
    throw error;
  }

  const pinValido = await bcrypt.compare(String(pin).trim(), cuenta.pin_hash);
  if (!pinValido) {
    const error = new Error('PIN incorrecto. Intente nuevamente.');
    error.statusCode = 401;
    throw error;
  }

  if (cuenta.estado_cuenta !== 'ACTIVO' || cuenta.estado_usuario !== 'ACTIVO') {
    const error = new Error(
      `Operación no permitida: la cuenta #${cuenta.numero_cuenta} se encuentra ${
        cuenta.estado_cuenta !== 'ACTIVO' ? cuenta.estado_cuenta : cuenta.estado_usuario
      }.`
    );
    error.statusCode = 403;
    throw error;
  }

  return {
    cuenta_id: cuenta.id,
    numero_cuenta: cuenta.numero_cuenta,
    tipo_cuenta: cuenta.tipo_cuenta,
    titular_nombre: cuenta.titular_nombre,
    titular_documento: cuenta.titular_documento
  };
}

/**
 * Verifica en tiempo real en la base de datos las sesiones activas actuales.
 */
async function sincronizarSesionActiva(session) {
  let usuarioActualizado = null;
  let cajeroActualizado = null;

  if (session && session.usuario) {
    const u = await UsuariosModel.buscarPorId(session.usuario.id);
    if (u && u.estado === 'ACTIVO' && (u.rol === 'ADMIN' || u.estado_cuenta === 'ACTIVO')) {
      usuarioActualizado = {
        id: u.id,
        documento: u.documento,
        nombre_completo: u.nombre_completo,
        correo: u.correo,
        rol: u.rol,
        estado: u.estado,
        cuenta_id: u.cuenta_id,
        numero_cuenta: u.numero_cuenta,
        tipo_cuenta: u.tipo_cuenta
      };
    }
  }

  if (session && session.cajero) {
    const c = await CuentasModel.buscarPorId(session.cajero.cuenta_id);
    if (c && c.estado_cuenta === 'ACTIVO' && c.estado_usuario === 'ACTIVO') {
      cajeroActualizado = {
        cuenta_id: c.id,
        numero_cuenta: c.numero_cuenta,
        tipo_cuenta: c.tipo_cuenta,
        titular_nombre: c.titular_nombre,
        titular_documento: c.titular_documento
      };
    }
  }

  return { usuarioActualizado, cajeroActualizado };
}

module.exports = {
  autenticarUsuario,
  autenticarCajero,
  sincronizarSesionActiva
};
