const CajeroService = require('../services/cajero.service');

/**
 * CONTROLADOR DE CAJERO AUTOMÁTICO ("El Mesero")
 * Recibe las peticiones HTTP del Cajero (req), llama al Servicio (CajeroService)
 * y entrega la respuesta JSON al Cliente (res).
 */

async function consultarSaldo(req, res) {
  try {
    const cuenta = CajeroService.obtenerResumenSaldo(req.cuentaCajero);
    return res.json({
      ok: true,
      cuenta
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al consultar el saldo en el cajero.',
      error: error.message
    });
  }
}

async function realizarRetiro(req, res) {
  try {
    const { valor, descripcion } = req.body;
    const resultado = await CajeroService.realizarRetiro(req.cuentaCajero.id, valor, descripcion);

    return res.json({
      ok: true,
      mensaje: 'Retiro realizado correctamente.',
      retiro: resultado
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      ok: false,
      mensaje: error.message || 'Error al procesar el retiro en el cajero.'
    });
  }
}

async function consultarUltimosMovimientos(req, res) {
  try {
    const resultado = await CajeroService.obtenerUltimosMovimientos(req.cuentaCajero, 10);
    return res.json({
      ok: true,
      ...resultado
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al consultar los últimos movimientos.',
      error: error.message
    });
  }
}

module.exports = {
  consultarSaldo,
  realizarRetiro,
  consultarUltimosMovimientos
};
