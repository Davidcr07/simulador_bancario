const AuthService = require('../services/auth.service');

/**
 * CONTROLADOR DE AUTENTICACIÓN ("El Mesero")
 * Recibe las peticiones HTTP (req), delega la lógica al Servicio (AuthService)
 * y devuelve la respuesta JSON al Cliente (res).
 */

async function loginUsuario(req, res) {
  try {
    const usuarioSesion = await AuthService.autenticarUsuario(req.body);
    req.session.usuario = usuarioSesion;

    return res.json({
      ok: true,
      mensaje: `Bienvenido(a), ${usuarioSesion.nombre_completo}.`,
      usuario: usuarioSesion
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      ok: false,
      mensaje: error.message || 'Error interno al procesar el inicio de sesión.'
    });
  }
}

async function loginCajero(req, res) {
  try {
    const cajeroSesion = await AuthService.autenticarCajero(req.body);
    req.session.cajero = cajeroSesion;

    return res.json({
      ok: true,
      mensaje: `Bienvenido(a) al Cajero Automático, ${cajeroSesion.titular_nombre}.`,
      cajero: cajeroSesion
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      ok: false,
      mensaje: error.message || 'Error interno al validar credenciales en el cajero.'
    });
  }
}

async function obtenerSesionActual(req, res) {
  try {
    const { usuarioActualizado, cajeroActualizado } = await AuthService.sincronizarSesionActiva(req.session);

    if (req.session) {
      req.session.usuario = usuarioActualizado;
      req.session.cajero = cajeroActualizado;
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
