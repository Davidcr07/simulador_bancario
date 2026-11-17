const bcrypt = require('bcryptjs');
const UsuariosModel = require('../models/usuarios.model');
const CuentasModel = require('../models/cuentas.model');

/**
 * POST /api/auth/login
 * Autentica a un Cliente (Banca Virtual) o Administrador (Panel Administrativo).
 */
async function loginUsuario(req, res) {
  try {
    const { identificador, password, rolEsperado } = req.body;

    if (!identificador || !password) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Por favor ingrese su correo/documento y contraseña.'
      });
    }

    const usuario = await UsuariosModel.buscarPorIdentificador(String(identificador).trim());

    if (!usuario) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Credenciales incorrectas. Verifique sus datos e intente nuevamente.'
      });
    }

    // Validar que el usuario intente ingresar por el módulo correspondiente a su rol
    if (rolEsperado && usuario.rol !== rolEsperado) {
      return res.status(403).json({
        ok: false,
        mensaje:
          rolEsperado === 'ADMIN'
            ? 'Acceso denegado: esta cuenta no tiene privilegios de Administrador.'
            : 'Acceso denegado: los administradores deben ingresar por el Módulo Administrativo.'
      });
    }

    // Validar contraseña encriptada con bcrypt
    const passwordValido = await bcrypt.compare(String(password), usuario.password_hash);
    if (!passwordValido) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Credenciales incorrectas. Verifique sus datos e intente nuevamente.'
      });
    }

    // Regla de negocio: una cuenta o usuario BLOQUEADO / INACTIVO no puede operar
    if (usuario.estado !== 'ACTIVO') {
      return res.status(403).json({
        ok: false,
        mensaje: `Acceso denegado: su usuario se encuentra en estado ${usuario.estado}. Contacte al banco.`
      });
    }

    if (usuario.rol === 'CLIENTE' && usuario.estado_cuenta && usuario.estado_cuenta !== 'ACTIVO') {
      return res.status(403).json({
        ok: false,
        mensaje: `Acceso denegado: su cuenta bancaria (#${usuario.numero_cuenta}) está en estado ${usuario.estado_cuenta}.`
      });
    }

    // Guardar datos seguros en la sesión
    req.session.usuario = {
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

    return res.json({
      ok: true,
      mensaje: `Bienvenido(a), ${usuario.nombre_completo}.`,
      usuario: req.session.usuario
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error interno al procesar el inicio de sesión.',
      error: error.message
    });
  }
}

/**
 * POST /api/auth/cajero
 * Autentica a un cliente en el Cajero Automático mediante Número de Cuenta y PIN.
 */
async function loginCajero(req, res) {
  try {
    const { numero_cuenta, pin } = req.body;

    if (!numero_cuenta || !pin) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Debe ingresar el número de cuenta y el PIN.'
      });
    }

    const cuenta = await CuentasModel.buscarPorNumeroCuenta(String(numero_cuenta).trim());

    if (!cuenta) {
      return res.status(404).json({
        ok: false,
        mensaje: 'La cuenta ingresada no existe en el sistema.'
      });
    }

    const pinValido = await bcrypt.compare(String(pin).trim(), cuenta.pin_hash);
    if (!pinValido) {
      return res.status(401).json({
        ok: false,
        mensaje: 'PIN incorrecto. Intente nuevamente.'
      });
    }

    if (cuenta.estado_cuenta !== 'ACTIVO' || cuenta.estado_usuario !== 'ACTIVO') {
      return res.status(403).json({
        ok: false,
        mensaje: `Operación no permitida: la cuenta #${cuenta.numero_cuenta} se encuentra ${
          cuenta.estado_cuenta !== 'ACTIVO' ? cuenta.estado_cuenta : cuenta.estado_usuario
        }.`
      });
    }

    req.session.cajero = {
      cuenta_id: cuenta.id,
      numero_cuenta: cuenta.numero_cuenta,
      tipo_cuenta: cuenta.tipo_cuenta,
      titular_nombre: cuenta.titular_nombre,
      titular_documento: cuenta.titular_documento
    };

    return res.json({
      ok: true,
      mensaje: `Bienvenido(a) al Cajero Automático, ${cuenta.titular_nombre}.`,
      cajero: req.session.cajero
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error interno al validar credenciales en el cajero.',
      error: error.message
    });
  }
}

/**
 * GET /api/auth/me
 * Retorna la información de las sesiones activas (Banca Virtual/Admin y Cajero).
 */
async function obtenerSesionActual(req, res) {
  try {
    let usuarioActualizado = null;
    let cajeroActualizado = null;

    if (req.session && req.session.usuario) {
      const u = await UsuariosModel.buscarPorId(req.session.usuario.id);
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
        req.session.usuario = usuarioActualizado;
      } else {
        req.session.usuario = null;
      }
    }

    if (req.session && req.session.cajero) {
      const c = await CuentasModel.buscarPorId(req.session.cajero.cuenta_id);
      if (c && c.estado_cuenta === 'ACTIVO' && c.estado_usuario === 'ACTIVO') {
        cajeroActualizado = {
          cuenta_id: c.id,
          numero_cuenta: c.numero_cuenta,
          tipo_cuenta: c.tipo_cuenta,
          titular_nombre: c.titular_nombre,
          titular_documento: c.titular_documento
        };
        req.session.cajero = cajeroActualizado;
      } else {
        req.session.cajero = null;
      }
    }

    return res.json({
      ok: true,
      autenticado: Boolean(usuarioActualizado || cajeroActualizado),
      usuario: usuarioActualizado,
      cajero: cajeroActualizado
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al consultar la sesión actual.',
      error: error.message
    });
  }
}

/**
 * POST /api/auth/logout
 * Cierra la sesión actual (puede cerrar solo 'cajero', solo 'usuario' o toda la sesión).
 */
function cerrarSesion(req, res) {
  const { modulo } = req.body || {};

  if (!req.session) {
    return res.json({ ok: true, mensaje: 'Sesión finalizada correctamente.' });
  }

  if (modulo === 'cajero') {
    req.session.cajero = null;
    return res.json({ ok: true, mensaje: 'Operación en cajero automático finalizada.' });
  }

  if (modulo === 'usuario') {
    req.session.usuario = null;
    return res.json({ ok: true, mensaje: 'Sesión cerrada correctamente.' });
  }

  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        ok: false,
        mensaje: 'No se pudo cerrar la sesión.'
      });
    }
    res.clearCookie('connect.sid');
    return res.json({
      ok: true,
      mensaje: 'Sesión cerrada correctamente.'
    });
  });
}

module.exports = {
  loginUsuario,
  loginCajero,
  obtenerSesionActual,
  cerrarSesion
};
