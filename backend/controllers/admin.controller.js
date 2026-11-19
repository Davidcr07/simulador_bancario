const AdminService = require('../services/admin.service');

/**
 * CONTROLADOR ADMINISTRATIVO ("El Mesero")
 * Recibe las peticiones HTTP del Administrador (req), delega la lógica de negocio
 * al Servicio (AdminService) y responde en JSON (res).
 */

async function obtenerDashboard(req, res) {
  try {
    const metricas = await AdminService.obtenerDashboard();
    return res.json({
      ok: true,
      metricas
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al consultar las métricas del dashboard administrativo.',
      error: error.message
    });
  }
}

async function listarClientes(req, res) {
  try {
    const { q } = req.query;
    const clientes = await AdminService.listarClientes(q || '');
    return res.json({
      ok: true,
      clientes
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al listar los clientes.',
      error: error.message
    });
  }
}

async function obtenerDetalleCliente(req, res) {
  try {
    const detalle = await AdminService.obtenerDetalleCliente(req.params.id);
    return res.json({
      ok: true,
      ...detalle
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      ok: false,
      mensaje: error.message || 'Error al consultar el detalle del cliente.'
    });
  }
}

async function crearCliente(req, res) {
  try {
    const nuevoCliente = await AdminService.crearCliente(req.body);
    return res.status(201).json({
      ok: true,
      mensaje: `Cliente ${nuevoCliente.nombre_completo} creado exitosamente con la cuenta N.° ${nuevoCliente.numero_cuenta}.`,
      cliente: nuevoCliente
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      ok: false,
      mensaje: error.message || 'No se pudo crear el cliente.'
    });
  }
}

async function editarCliente(req, res) {
  try {
    const clienteActualizado = await AdminService.editarCliente(req.params.id, req.body);
    return res.json({
      ok: true,
      mensaje: 'Información del cliente actualizada correctamente.',
      cliente: clienteActualizado
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      ok: false,
      mensaje: error.message || 'Error al editar la información del cliente.'
    });
  }
}

async function cambiarEstadoCliente(req, res) {
  try {
    const { estado } = req.body;
    const resultado = await AdminService.cambiarEstadoCliente(req.params.id, estado);
    return res.json({
      ok: true,
      mensaje: `El estado del cliente ${resultado.nombre_completo} (Cuenta N.° ${resultado.numero_cuenta}) cambió a ${resultado.nuevo_estado}.`,
      resultado
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      ok: false,
      mensaje: error.message || 'Error al cambiar el estado del cliente.'
    });
  }
}

async function listarCuentas(req, res) {
  try {
    const cuentas = await AdminService.listarCuentas();
    return res.json({
      ok: true,
      cuentas
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al consultar las cuentas bancarias.',
      error: error.message
    });
  }
}

async function realizarConsignacion(req, res) {
  try {
    const consignacion = await AdminService.realizarConsignacion(req.body);
    return res.json({
      ok: true,
      mensaje: 'Consignación aplicada exitosamente.',
      consignacion
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      ok: false,
      mensaje: error.message || 'No se pudo realizar la consignación.'
    });
  }
}

async function listarMovimientosGenerales(req, res) {
  try {
    const { tipo } = req.query;
    const movimientos = await AdminService.obtenerHistorialGeneralMovimientos(tipo || null);
    return res.json({
      ok: true,
      movimientos
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al consultar el historial general de movimientos.',
      error: error.message
    });
  }
}

module.exports = {
  obtenerDashboard,
  listarClientes,
  obtenerDetalleCliente,
  crearCliente,
  editarCliente,
  cambiarEstadoCliente,
  listarCuentas,
  realizarConsignacion,
  listarMovimientosGenerales
};
