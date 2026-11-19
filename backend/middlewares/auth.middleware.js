const UsuariosModel = require('../models/usuarios.model');
const CuentasModel = require('../models/cuentas.model');

/**
 * Middleware que protege las rutas exclusivas de la Banca Virtual (Rol: CLIENTE).
 * Verifica en tiempo real en MySQL que tanto el usuario como su cuenta sigan en estado ACTIVO.
 */
async function verificarCliente(req, res, next) {
  try {
    if (!req.session || !req.session.usuario) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Debe iniciar sesión en la Banca Virtual para continuar.'
      });
    }

    if (req.session.usuario.rol !== 'CLIENTE') {
      return res.status(403).json({
        ok: false,
        mensaje: 'Acceso denegado: esta sección es exclusiva para clientes.'
      });
    }

    const usuarioActual = await UsuariosModel.buscarPorId(req.session.usuario.id);

    if (!usuarioActual) {
      req.session.usuario = null;
      return res.status(401).json({
        ok: false,
        mensaje: 'El usuario de la sesión ya no existe.'
      });
    }

    if (usuarioActual.estado !== 'ACTIVO' || usuarioActual.estado_cuenta !== 'ACTIVO') {
      req.session.usuario = null;
      return res.status(403).json({
        ok: false,
        mensaje: `Operación rechazada: su cuenta o usuario se encuentra en estado ${
          usuarioActual.estado !== 'ACTIVO' ? usuarioActual.estado : usuarioActual.estado_cuenta
        }.`
      });
    }

    req.usuario = usuarioActual;
    next();
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al verificar permisos de cliente.',
      error: error.message
    });
  }
}

/**
 * Middleware que protege las rutas exclusivas del Módulo Administrativo (Rol: ADMIN).
 */
async function verificarAdmin(req, res, next) {
  try {
    if (!req.session || !req.session.usuario) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Debe iniciar sesión como Administrador para continuar.'
      });
    }

    if (req.session.usuario.rol !== 'ADMIN') {
      return res.status(403).json({
        ok: false,
        mensaje: 'Acceso denegado: se requieren permisos de Administrador.'
      });
    }

    const adminActual = await UsuariosModel.buscarPorId(req.session.usuario.id);

    if (!adminActual || adminActual.estado !== 'ACTIVO') {
      req.session.usuario = null;
      return res.status(403).json({
        ok: false,
        mensaje: 'Su cuenta de administrador no se encuentra activa.'
      });
    }

    req.usuario = adminActual;
    next();
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al verificar permisos de administrador.',
      error: error.message
    });
  }
}

/**
 * Middleware que protege las operaciones del Cajero Automático Virtual.
 * Verifica en tiempo real que la cuenta exista y esté en estado ACTIVO.
 */
async function verificarCajero(req, res, next) {
  try {
    if (!req.session || !req.session.cajero) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Debe identificarse con su número de cuenta y PIN en el cajero.'
      });
    }

    const cuentaActual = await CuentasModel.buscarPorId(req.session.cajero.cuenta_id);

    if (!cuentaActual) {
      req.session.cajero = null;
      return res.status(404).json({
        ok: false,
        mensaje: 'La cuenta bancaria no existe.'
      });
    }

    if (cuentaActual.estado_cuenta !== 'ACTIVO' || cuentaActual.estado_usuario !== 'ACTIVO') {
      req.session.cajero = null;
      return res.status(403).json({
        ok: false,
        mensaje: 'Esta cuenta se encuentra BLOQUEADA o INACTIVA y no puede realizar operaciones.'
      });
    }

    req.cuentaCajero = cuentaActual;
    next();
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al verificar la sesión del cajero automático.',
      error: error.message
    });
  }
}

module.exports = {
  verificarCliente,
  verificarAdmin,
  verificarCajero
};
