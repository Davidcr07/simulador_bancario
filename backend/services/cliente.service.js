const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const UsuariosModel = require('../models/usuarios.model');
const CuentasModel = require('../models/cuentas.model');
const MovimientosModel = require('../models/movimientos.model');
const TransferenciasModel = require('../models/transferencias.model');

/**
 * SERVICIO DE CLIENTE - BANCA VIRTUAL ("El Cocinero")
 * Contiene toda la lógica de negocio del Módulo 1 (Banca Virtual del Cliente):
 * consulta de saldo y cuenta, historial de movimientos, transferencias transaccionales
 * en 4 pasos, modificación de datos permitidos del perfil y cambio de contraseña.
 */

/**
 * Obtiene la información personal del cliente y el estado actual de su cuenta bancaria.
 */
async function obtenerResumenCliente(usuarioId) {
  const cliente = await UsuariosModel.buscarPorId(usuarioId);
  if (!cliente) {
    const error = new Error('No se encontró la información del cliente.');
    error.statusCode = 404;
    throw error;
  }

  return {
    perfil: {
      id: cliente.id,
      documento: cliente.documento,
      nombre_completo: cliente.nombre_completo,
      correo: cliente.correo,
      telefono: cliente.telefono || '',
      direccion: cliente.direccion || '',
      rol: cliente.rol,
      estado: cliente.estado,
      fecha_creacion: cliente.fecha_creacion
    },
    cuenta: {
      id: cliente.cuenta_id,
      numero_cuenta: cliente.numero_cuenta,
      tipo_cuenta: cliente.tipo_cuenta,
      saldo: Number(cliente.saldo || 0),
      estado: cliente.estado_cuenta,
      fecha_apertura: cliente.fecha_apertura
    }
  };
}

/**
 * Obtiene el historial completo de movimientos de la cuenta del cliente.
 */
async function obtenerHistorialMovimientos(usuarioId) {
  const cliente = await UsuariosModel.buscarPorId(usuarioId);
  if (!cliente || !cliente.cuenta_id) {
    const error = new Error('No se encontró una cuenta bancaria asociada al cliente.');
    error.statusCode = 404;
    throw error;
  }

  const movimientos = await MovimientosModel.listarPorCuenta(cliente.cuenta_id);
  return {
    cuenta: {
      id: cliente.cuenta_id,
      numero_cuenta: cliente.numero_cuenta,
      tipo_cuenta: cliente.tipo_cuenta,
      saldo: Number(cliente.saldo)
    },
    movimientos
  };
}

/**
 * Ejecuta una transferencia hacia otra cuenta registrada cumpliendo la Sección 6 del PDF:
 * Verificaciones previas:
 *   - Existencia de la cuenta origen
 *   - Existencia de la cuenta destino
 *   - Estado ACTIVO de ambas cuentas y sus titulares
 *   - Valor válido (> 0)
 *   - Saldo suficiente en la cuenta origen
 * Acciones atómicas en transacción SQL:
 *   1. Descontar el dinero de la cuenta origen.
 *   2. Incrementar el saldo de la cuenta destino.
 *   3. Registrar el movimiento en la cuenta origen (TRANSFERENCIA_ENVIADA).
 *   4. Registrar el movimiento en la cuenta destino (TRANSFERENCIA_RECIBIDA).
 *   5. Registrar la trazabilidad en la tabla `transferencias`.
 */
async function realizarTransferencia(usuarioId, { numero_cuenta_destino, valor, descripcion }) {
  const cuentaDestinoLimpiada = String(numero_cuenta_destino || '').trim();
  const monto = Number(valor);

  if (!cuentaDestinoLimpiada) {
    const error = new Error('Debe ingresar el número de la cuenta destino.');
    error.statusCode = 400;
    throw error;
  }

  if (valor === undefined || valor === null || valor === '' || !Number.isFinite(monto)) {
    const error = new Error('Debe ingresar un valor numérico válido para la transferencia.');
    error.statusCode = 400;
    throw error;
  }

  if (monto <= 0) {
    const error = new Error('No se permiten transferencias con valores iguales o menores que cero.');
    error.statusCode = 400;
    throw error;
  }

  const clienteOrigen = await UsuariosModel.buscarPorId(usuarioId);
  if (!clienteOrigen || !clienteOrigen.cuenta_id) {
    const error = new Error('La cuenta origen del cliente no existe.');
    error.statusCode = 404;
    throw error;
  }

  if (clienteOrigen.numero_cuenta === cuentaDestinoLimpiada) {
    const error = new Error('No puede realizar una transferencia hacia su misma cuenta bancaria.');
    error.statusCode = 400;
    throw error;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verificar y bloquear cuenta origen
    const cuentaOrigen = await CuentasModel.obtenerPorIdParaTransaccion(connection, clienteOrigen.cuenta_id);
    if (!cuentaOrigen) {
      const error = new Error('La cuenta origen no existe.');
      error.statusCode = 404;
      throw error;
    }

    if (cuentaOrigen.estado_cuenta !== 'ACTIVO' || cuentaOrigen.estado_usuario !== 'ACTIVO') {
      const error = new Error('Su cuenta origen no se encuentra activa para realizar transferencias.');
      error.statusCode = 403;
      throw error;
    }

    // Verificar y bloquear cuenta destino
    const cuentaDestino = await CuentasModel.obtenerPorNumeroParaTransaccion(connection, cuentaDestinoLimpiada);
    if (!cuentaDestino) {
      const error = new Error(`La cuenta destino N.° ${cuentaDestinoLimpiada} no existe en NovaBank.`);
      error.statusCode = 404;
      throw error;
    }

    if (cuentaDestino.estado_cuenta !== 'ACTIVO' || cuentaDestino.estado_usuario !== 'ACTIVO') {
      const error = new Error(
        `No es posible transferir: la cuenta destino N.° ${cuentaDestino.numero_cuenta} no se encuentra activa.`
      );
      error.statusCode = 400;
      throw error;
    }

    const saldoOrigenActual = Number(cuentaOrigen.saldo);
    if (monto > saldoOrigenActual) {
      const error = new Error('Saldo insuficiente para realizar la transferencia solicitada.');
      error.statusCode = 400;
      throw error;
    }

    const saldoDestinoActual = Number(cuentaDestino.saldo);
    const nuevoSaldoOrigen = Number((saldoOrigenActual - monto).toFixed(2));
    const nuevoSaldoDestino = Number((saldoDestinoActual + monto).toFixed(2));

    const conceptoExtra =
      descripcion && String(descripcion).trim() !== ''
        ? ` - ${String(descripcion).trim()}`
        : '';

    const descOrigen = `Transferencia enviada a cuenta ${cuentaDestino.numero_cuenta} (${cuentaDestino.titular_nombre})${conceptoExtra}`;
    const descDestino = `Transferencia recibida desde cuenta ${cuentaOrigen.numero_cuenta} (${cuentaOrigen.titular_nombre})${conceptoExtra}`;

    // 1. Descontar el dinero de la cuenta origen
    await CuentasModel.actualizarSaldoEnTransaccion(connection, cuentaOrigen.id, nuevoSaldoOrigen);

    // 2. Incrementar el saldo de la cuenta destino
    await CuentasModel.actualizarSaldoEnTransaccion(connection, cuentaDestino.id, nuevoSaldoDestino);

    // 3. Registrar el movimiento en la cuenta origen
    const movimientoOrigenId = await MovimientosModel.crearEnTransaccion(connection, {
      cuenta_id: cuentaOrigen.id,
      tipo_movimiento: 'TRANSFERENCIA_ENVIADA',
      descripcion: descOrigen,
      valor: monto,
      saldo_resultante: nuevoSaldoOrigen
    });

    // 4. Registrar el movimiento en la cuenta destino
    await MovimientosModel.crearEnTransaccion(connection, {
      cuenta_id: cuentaDestino.id,
      tipo_movimiento: 'TRANSFERENCIA_RECIBIDA',
      descripcion: descDestino,
      valor: monto,
      saldo_resultante: nuevoSaldoDestino
    });

    // 5. Registrar en la tabla `transferencias`
    const transferenciaId = await TransferenciasModel.crearEnTransaccion(connection, {
      cuenta_origen_id: cuentaOrigen.id,
      cuenta_destino_id: cuentaDestino.id,
      valor: monto,
      descripcion:
        descripcion && String(descripcion).trim() !== ''
          ? String(descripcion).trim()
          : 'Transferencia entre cuentas NovaBank'
    });

    await connection.commit();

    return {
      transferencia_id: transferenciaId,
      movimiento_id: movimientoOrigenId,
      cuenta_origen: cuentaOrigen.numero_cuenta,
      cuenta_destino: cuentaDestino.numero_cuenta,
      destinatario_nombre: cuentaDestino.titular_nombre,
      valor_transferido: monto,
      saldo_anterior: saldoOrigenActual,
      nuevo_saldo: nuevoSaldoOrigen,
      descripcion:
        descripcion && String(descripcion).trim() !== ''
          ? String(descripcion).trim()
          : 'Transferencia entre cuentas NovaBank',
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
 * Actualiza los datos permitidos del perfil del cliente.
 */
async function actualizarPerfilCliente(usuarioId, { nombre_completo, correo, telefono, direccion }) {
  const nombreLimpio = String(nombre_completo || '').trim();
  const correoLimpio = String(correo || '').trim().toLowerCase();
  const telefonoLimpio = String(telefono || '').trim();
  const direccionLimpia = String(direccion || '').trim();

  if (!nombreLimpio || !correoLimpio) {
    const error = new Error('El nombre completo y el correo electrónico son obligatorios.');
    error.statusCode = 400;
    throw error;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(correoLimpio)) {
    const error = new Error('Por favor ingrese un correo electrónico con formato válido.');
    error.statusCode = 400;
    throw error;
  }

  const correoOcupado = await UsuariosModel.existeCorreoEnOtroUsuario(correoLimpio, usuarioId);
  if (correoOcupado) {
    const error = new Error('El correo electrónico ingresado ya está registrado por otro usuario.');
    error.statusCode = 409;
    throw error;
  }

  await UsuariosModel.actualizarPerfil(usuarioId, {
    nombre_completo: nombreLimpio,
    correo: correoLimpio,
    telefono: telefonoLimpio,
    direccion: direccionLimpia
  });

  return await obtenerResumenCliente(usuarioId);
}

/**
 * Cambia la contraseña del cliente verificando primero su contraseña actual.
 */
async function cambiarPasswordCliente(usuarioId, { password_actual, password_nueva, password_confirmacion }) {
  if (!password_actual || !password_nueva || !password_confirmacion) {
    const error = new Error('Debe completar la contraseña actual, la nueva contraseña y su confirmación.');
    error.statusCode = 400;
    throw error;
  }

  if (String(password_nueva).length < 6) {
    const error = new Error('La nueva contraseña debe tener al menos 6 caracteres.');
    error.statusCode = 400;
    throw error;
  }

  if (password_nueva !== password_confirmacion) {
    const error = new Error('La nueva contraseña y su confirmación no coinciden.');
    error.statusCode = 400;
    throw error;
  }

  const usuario = await UsuariosModel.buscarConPasswordPorId(usuarioId);
  if (!usuario) {
    const error = new Error('Usuario no encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const actualValida = await bcrypt.compare(String(password_actual), usuario.password_hash);
  if (!actualValida) {
    const error = new Error('La contraseña actual ingresada es incorrecta.');
    error.statusCode = 401;
    throw error;
  }

  const nuevoHash = await bcrypt.hash(String(password_nueva), 10);
  await UsuariosModel.actualizarPassword(usuarioId, nuevoHash);
}

module.exports = {
  obtenerResumenCliente,
  obtenerHistorialMovimientos,
  realizarTransferencia,
  actualizarPerfilCliente,
  cambiarPasswordCliente
};
