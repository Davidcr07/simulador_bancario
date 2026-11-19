const { pool } = require('../config/db');
const CuentasModel = require('../models/cuentas.model');
const MovimientosModel = require('../models/movimientos.model');

/**
 * SERVICIO DE CAJERO AUTOMÁTICO ("El Cocinero")
 * Orquesta las reglas de negocio del Cajero Automático (consulta de saldo,
 * validación y ejecución transaccional de retiros y consulta de movimientos).
 */

/**
 * Formatea la información de saldo de la cuenta autenticada en el cajero.
 */
function obtenerResumenSaldo(cuentaCajero) {
  return {
    id: cuentaCajero.id,
    numero_cuenta: cuentaCajero.numero_cuenta,
    tipo_cuenta: cuentaCajero.tipo_cuenta,
    titular_nombre: cuentaCajero.titular_nombre,
    titular_documento: cuentaCajero.titular_documento,
    estado: cuentaCajero.estado_cuenta,
    saldo: Number(cuentaCajero.saldo)
  };
}

/**
 * Ejecuta un retiro de efectivo cumpliendo todas las reglas de negocio:
 * 1. Que la cuenta exista.
 * 2. Que esté activa.
 * 3. Que el valor sea mayor que cero.
 * 4. Que exista saldo suficiente.
 * Disminuye el saldo, registra el movimiento y retorna el nuevo saldo.
 */
async function realizarRetiro(cuentaId, valor, descripcion) {
  const monto = Number(valor);

  if (valor === undefined || valor === null || valor === '' || !Number.isFinite(monto)) {
    const error = new Error('Debe ingresar un valor numérico válido para el retiro.');
    error.statusCode = 400;
    throw error;
  }

  if (monto <= 0) {
    const error = new Error('No se permiten retiros con valores iguales o menores que cero.');
    error.statusCode = 400;
    throw error;
  }

  const textoDescripcion =
    descripcion && String(descripcion).trim() !== ''
      ? String(descripcion).trim()
      : 'Retiro cajero';

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const cuenta = await CuentasModel.obtenerPorIdParaTransaccion(connection, cuentaId);
    if (!cuenta) {
      const error = new Error('La cuenta bancaria no existe.');
      error.statusCode = 404;
      throw error;
    }

    if (cuenta.estado_cuenta !== 'ACTIVO' || cuenta.estado_usuario !== 'ACTIVO') {
      const error = new Error('La cuenta se encuentra bloqueada o inactiva y no puede realizar retiros.');
      error.statusCode = 403;
      throw error;
    }

    const saldoActual = Number(cuenta.saldo);
    if (monto > saldoActual) {
      const error = new Error('Saldo insuficiente para realizar el retiro solicitado.');
      error.statusCode = 400;
      throw error;
    }

    const nuevoSaldo = Number((saldoActual - monto).toFixed(2));

    // 1. Actualizar saldo usando el Modelo de Cuentas
    await CuentasModel.actualizarSaldoEnTransaccion(connection, cuenta.id, nuevoSaldo);

    // 2. Registrar movimiento usando el Modelo de Movimientos
    const movimientoId = await MovimientosModel.crearEnTransaccion(connection, {
      cuenta_id: cuenta.id,
      tipo_movimiento: 'RETIRO_CAJERO',
      descripcion: textoDescripcion,
      valor: monto,
      saldo_resultante: nuevoSaldo
    });

    await connection.commit();

    return {
      movimiento_id: movimientoId,
      cuenta_id: cuenta.id,
      numero_cuenta: cuenta.numero_cuenta,
      tipo_cuenta: cuenta.tipo_cuenta,
      titular_nombre: cuenta.titular_nombre,
      valor_retirado: monto,
      saldo_anterior: saldoActual,
      nuevo_saldo: nuevoSaldo,
      fecha: new Date()
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Obtiene los últimos movimientos de la cuenta en el cajero automático.
 */
async function obtenerUltimosMovimientos(cuentaCajero, limite = 10) {
  const movimientos = await MovimientosModel.listarPorCuenta(cuentaCajero.id, limite);
  return {
    cuenta: {
      numero_cuenta: cuentaCajero.numero_cuenta,
      tipo_cuenta: cuentaCajero.tipo_cuenta,
      titular_nombre: cuentaCajero.titular_nombre,
      saldo: Number(cuentaCajero.saldo)
    },
    movimientos
  };
}

module.exports = {
  obtenerResumenSaldo,
  realizarRetiro,
  obtenerUltimosMovimientos
};
