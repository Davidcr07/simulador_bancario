const ClienteService = require('../services/cliente.service');

/**
 * CONTROLADOR DE CLIENTE - BANCA VIRTUAL ("El Mesero")
 * Recibe las peticiones HTTP del Cliente (req), delega la operación al
 * Servicio (ClienteService) y devuelve la respuesta JSON (res).
 */

async function obtenerResumen(req, res) {
  try {
    const datos = await ClienteService.obtenerResumenCliente(req.usuario.id);
    return res.json({
      ok: true,
      ...datos
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      ok: false,
      mensaje: error.message || 'Error al consultar la información de la cuenta.'
    });
  }
}

async function obtenerMovimientos(req, res) {
  try {
    const resultado = await ClienteService.obtenerHistorialMovimientos(req.usuario.id);
    return res.json({
      ok: true,
      ...resultado
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      ok: false,
      mensaje: error.message || 'Error al consultar el historial de movimientos.'
    });
  }
}

async function realizarTransferencia(req, res) {
  try {
    const transferencia = await ClienteService.realizarTransferencia(req.usuario.id, req.body);
    return res.json({
      ok: true,
      mensaje: 'Transferencia realizada exitosamente.',
      transferencia
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      ok: false,
      mensaje: error.message || 'No fue posible procesar la transferencia.'
    });
  }
}

async function actualizarPerfil(req, res) {
  try {
    const actualizado = await ClienteService.actualizarPerfilCliente(req.usuario.id, req.body);

    // Sincronizar datos en la sesión activa
    if (req.session && req.session.usuario) {
      req.session.usuario.nombre_completo = actualizado.perfil.nombre_completo;
      req.session.usuario.correo = actualizado.perfil.correo;
    }

    return res.json({
      ok: true,
      mensaje: 'Sus datos de perfil han sido actualizados correctamente.',
      ...actualizado
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      ok: false,
      mensaje: error.message || 'Error al actualizar los datos del perfil.'
    });
  }
}

async function cambiarPassword(req, res) {
  try {
    await ClienteService.cambiarPasswordCliente(req.usuario.id, req.body);
    return res.json({
      ok: true,
      mensaje: 'Su clave de acceso ha sido actualizada exitosamente.'
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      ok: false,
      mensaje: error.message || 'Error al cambiar la contraseña.'
    });
  }
}

module.exports = {
  obtenerResumen,
  obtenerMovimientos,
  realizarTransferencia,
  actualizarPerfil,
  cambiarPassword
};
