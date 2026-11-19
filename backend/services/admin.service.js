const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const UsuariosModel = require('../models/usuarios.model');
const CuentasModel = require('../models/cuentas.model');
const MovimientosModel = require('../models/movimientos.model');

/**
 * SERVICIO ADMINISTRATIVO ("El Cocinero")
 * Contiene toda la lógica de negocio del Módulo 2 (Panel Administrativo del Banco):
 * dashboard de indicadores, creación de clientes con cuenta y PIN, búsqueda/listado,
 * detalle de cliente, edición, cambio de estado (ACTIVO/INACTIVO/BLOQUEADO),
 * consulta de cuentas, consignaciones transaccionales e historial general.
 */

/**
 * Obtiene los indicadores principales para el Dashboard Administrativo (Sección 4 del PDF):
 * - Cantidad total de clientes
 * - Cantidad de clientes o cuentas activas
 * - Cantidad de clientes bloqueados
 * - Suma total de los saldos almacenados en las cuentas
 */
async function obtenerDashboard() {
  const metricasClientes = await UsuariosModel.obtenerMetricasClientes();
  const metricasCuentas = await CuentasModel.obtenerMetricasCuentas();

  return {
    total_clientes: Number(metricasClientes.total_clientes || 0),
    clientes_activos: Number(metricasClientes.clientes_activos || 0),
    clientes_inactivos: Number(metricasClientes.clientes_inactivos || 0),
    clientes_bloqueados: Number(metricasClientes.clientes_bloqueados || 0),
    total_cuentas: Number(metricasCuentas.total_cuentas || 0),
    cuentas_activas: Number(metricasCuentas.cuentas_activas || 0),
    cuentas_bloqueadas: Number(metricasCuentas.cuentas_bloqueadas || 0),
    suma_total_saldos: Number(metricasCuentas.suma_total_saldos || 0)
  };
}

/**
 * Lista o busca clientes por nombre, documento, correo o número de cuenta.
 */
async function listarClientes(busqueda = '') {
  const clientes = await UsuariosModel.listarClientes(busqueda);
  return clientes.map((c) => ({
    ...c,
    saldo: Number(c.saldo || 0)
  }));
}

/**
 * Consulta la información detallada de un cliente junto con su cuenta y sus movimientos.
 */
async function obtenerDetalleCliente(clienteId) {
  const cliente = await UsuariosModel.buscarPorId(clienteId);
  if (!cliente || cliente.rol !== 'CLIENTE') {
    const error = new Error('El cliente solicitado no existe.');
    error.statusCode = 404;
    throw error;
  }

  const movimientos = cliente.cuenta_id
    ? await MovimientosModel.listarPorCuenta(cliente.cuenta_id, 25)
    : [];

  return {
    cliente: {
      id: cliente.id,
      documento: cliente.documento,
      nombre_completo: cliente.nombre_completo,
      correo: cliente.correo,
      telefono: cliente.telefono || '',
      direccion: cliente.direccion || '',
      estado: cliente.estado,
      fecha_creacion: cliente.fecha_creacion,
      cuenta_id: cliente.cuenta_id,
      numero_cuenta: cliente.numero_cuenta,
      tipo_cuenta: cliente.tipo_cuenta,
      saldo: Number(cliente.saldo || 0),
      estado_cuenta: cliente.estado_cuenta,
      fecha_apertura: cliente.fecha_apertura
    },
    movimientos
  };
}

/**
 * Genera un número de cuenta único de 10 dígitos con prefijo bancario 1001.
 */
async function generarNumeroCuentaUnico() {
  for (let i = 0; i < 15; i++) {
    const sufijo = Math.floor(100000 + Math.random() * 900000);
    const candidato = `1001${sufijo}`;
    const existe = await CuentasModel.buscarPorNumeroCuenta(candidato);
    if (!existe) {
      return candidato;
    }
  }
  return `1001${Date.now().toString().slice(-6)}`;
}

/**
 * Crea un nuevo cliente junto con su cuenta bancaria en una transacción SQL.
 * Si tiene saldo inicial > 0, registra automáticamente el movimiento de CONSIGNACION.
 */
async function crearCliente({
  documento,
  nombre_completo,
  correo,
  telefono,
  direccion,
  password,
  tipo_cuenta,
  numero_cuenta,
  pin,
  saldo_inicial
}) {
  const docLimpio = String(documento || '').trim();
  const nombreLimpio = String(nombre_completo || '').trim();
  const correoLimpio = String(correo || '').trim().toLowerCase();
  const telefonoLimpio = String(telefono || '').trim();
  const direccionLimpia = String(direccion || '').trim();
  const passwordTexto = String(password || '');
  const pinTexto = String(pin || '').trim();
  const tipoCuentaValido = tipo_cuenta === 'CORRIENTE' ? 'CORRIENTE' : 'AHORROS';
  const saldoApertura = saldo_inicial !== undefined && saldo_inicial !== '' ? Number(saldo_inicial) : 0;

  if (!docLimpio || !nombreLimpio || !correoLimpio || !passwordTexto || !pinTexto) {
    const error = new Error(
      'Los campos Cédula/Documento, Nombre completo, Correo, Contraseña y PIN de cajero son obligatorios.'
    );
    error.statusCode = 400;
    throw error;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(correoLimpio)) {
    const error = new Error('El correo electrónico no tiene un formato válido.');
    error.statusCode = 400;
    throw error;
  }

  if (passwordTexto.length < 6) {
    const error = new Error('La contraseña del cliente debe tener al menos 6 caracteres.');
    error.statusCode = 400;
    throw error;
  }

  if (!/^\d{4,6}$/.test(pinTexto)) {
    const error = new Error('El PIN del cajero automático debe ser numérico de 4 a 6 dígitos.');
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(saldoApertura) || saldoApertura < 0) {
    const error = new Error('El saldo inicial no puede ser negativo.');
    error.statusCode = 400;
    throw error;
  }

  const duplicado = await UsuariosModel.existeDocumentoOCorreo(docLimpio, correoLimpio);
  if (duplicado) {
    const error = new Error(
      duplicado.documento === docLimpio
        ? `Ya existe un usuario registrado con el documento ${docLimpio}.`
        : `Ya existe un usuario registrado con el correo ${correoLimpio}.`
    );
    error.statusCode = 409;
    throw error;
  }

  let numeroCuentaFinal = numero_cuenta ? String(numero_cuenta).trim() : '';
  if (numeroCuentaFinal) {
    const cuentaExistente = await CuentasModel.buscarPorNumeroCuenta(numeroCuentaFinal);
    if (cuentaExistente) {
      const error = new Error(`El número de cuenta ${numeroCuentaFinal} ya está asignado a otro cliente.`);
      error.statusCode = 409;
      throw error;
    }
  } else {
    numeroCuentaFinal = await generarNumeroCuentaUnico();
  }

  const passwordHash = await bcrypt.hash(passwordTexto, 10);
  const pinHash = await bcrypt.hash(pinTexto, 10);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Crear el registro en la tabla `usuarios`
    const nuevoUsuarioId = await UsuariosModel.crearEnTransaccion(connection, {
      documento: docLimpio,
      nombre_completo: nombreLimpio,
      correo: correoLimpio,
      telefono: telefonoLimpio,
      direccion: direccionLimpia,
      password_hash: passwordHash,
      rol: 'CLIENTE',
      estado: 'ACTIVO'
    });

    // 2. Crear la cuenta bancaria asociada en `cuentas`
    const nuevaCuentaId = await CuentasModel.crearEnTransaccion(connection, {
      usuario_id: nuevoUsuarioId,
      numero_cuenta: numeroCuentaFinal,
      tipo_cuenta: tipoCuentaValido,
      saldo: saldoApertura,
      pin_hash: pinHash,
      estado: 'ACTIVO'
    });

    // 3. Si el saldo inicial es mayor que cero, generar el movimiento de consignación inicial
    if (saldoApertura > 0) {
      await MovimientosModel.crearEnTransaccion(connection, {
        cuenta_id: nuevaCuentaId,
        tipo_movimiento: 'CONSIGNACION',
        descripcion: 'Consignación inicial de apertura de cuenta',
        valor: saldoApertura,
        saldo_resultante: saldoApertura
      });
    }

    await connection.commit();

    return {
      usuario_id: nuevoUsuarioId,
      cuenta_id: nuevaCuentaId,
      documento: docLimpio,
      nombre_completo: nombreLimpio,
      correo: correoLimpio,
      numero_cuenta: numeroCuentaFinal,
      tipo_cuenta: tipoCuentaValido,
      saldo: saldoApertura,
      estado: 'ACTIVO'
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Edita la información permitida de un cliente desde el Panel Administrativo.
 */
async function editarCliente(clienteId, { nombre_completo, correo, telefono, direccion, tipo_cuenta }) {
  const clienteActual = await UsuariosModel.buscarPorId(clienteId);
  if (!clienteActual || clienteActual.rol !== 'CLIENTE') {
    const error = new Error('El cliente no existe.');
    error.statusCode = 404;
    throw error;
  }

  const nombreLimpio = String(nombre_completo || '').trim();
  const correoLimpio = String(correo || '').trim().toLowerCase();
  const telefonoLimpio = String(telefono || '').trim();
  const direccionLimpia = String(direccion || '').trim();

  if (!nombreLimpio || !correoLimpio) {
    const error = new Error('El nombre completo y el correo electrónico son obligatorios.');
    error.statusCode = 400;
    throw error;
  }

  const correoOcupado = await UsuariosModel.existeCorreoEnOtroUsuario(correoLimpio, clienteActual.id);
  if (correoOcupado) {
    const error = new Error('El correo electrónico ya está registrado por otro usuario.');
    error.statusCode = 409;
    throw error;
  }

  await UsuariosModel.actualizarPerfil(clienteActual.id, {
    nombre_completo: nombreLimpio,
    correo: correoLimpio,
    telefono: telefonoLimpio,
    direccion: direccionLimpia
  });

  if (tipo_cuenta && (tipo_cuenta === 'AHORROS' || tipo_cuenta === 'CORRIENTE')) {
    await CuentasModel.actualizarTipoPorUsuario(clienteActual.id, tipo_cuenta);
  }

  return await UsuariosModel.buscarPorId(clienteActual.id);
}

/**
 * Cambia el estado de un cliente y su cuenta bancaria (ACTIVO, INACTIVO, BLOQUEADO).
 * No se elimina físicamente de la base de datos (Sección 4 del PDF).
 */
async function cambiarEstadoCliente(clienteId, nuevoEstado) {
  const estadosPermitidos = ['ACTIVO', 'INACTIVO', 'BLOQUEADO'];
  const estadoNormalizado = String(nuevoEstado || '').trim().toUpperCase();

  if (!estadosPermitidos.includes(estadoNormalizado)) {
    const error = new Error('Estado inválido. Los estados permitidos son: ACTIVO, INACTIVO o BLOQUEADO.');
    error.statusCode = 400;
    throw error;
  }

  const cliente = await UsuariosModel.buscarPorId(clienteId);
  if (!cliente || cliente.rol !== 'CLIENTE') {
    const error = new Error('El cliente solicitado no existe.');
    error.statusCode = 404;
    throw error;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await UsuariosModel.actualizarEstadoEnTransaccion(connection, cliente.id, estadoNormalizado);
    await CuentasModel.actualizarEstadoPorUsuarioEnTransaccion(connection, cliente.id, estadoNormalizado);

    await connection.commit();

    return {
      cliente_id: cliente.id,
      nombre_completo: cliente.nombre_completo,
      numero_cuenta: cliente.numero_cuenta,
      nuevo_estado: estadoNormalizado
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Consulta todas las cuentas bancarias y sus saldos.
 */
async function listarCuentas() {
  const cuentas = await CuentasModel.listarTodas();
  return cuentas.map((c) => ({
    ...c,
    saldo: Number(c.saldo || 0)
  }));
}

/**
 * Realiza una consignación bancaria en una cuenta registrada:
 * - Verifica que la cuenta exista y esté ACTIVA.
 * - Verifica que el valor sea > 0.
 * - Incrementa el saldo de la cuenta y genera el movimiento CONSIGNACION.
 */
async function realizarConsignacion({ numero_cuenta, valor, descripcion }) {
  const cuentaLimpiada = String(numero_cuenta || '').trim();
  const monto = Number(valor);

  if (!cuentaLimpiada) {
    const error = new Error('Debe indicar el número de cuenta para la consignación.');
    error.statusCode = 400;
    throw error;
  }

  if (valor === undefined || valor === null || valor === '' || !Number.isFinite(monto) || monto <= 0) {
    const error = new Error('El valor de la consignación debe ser mayor que cero.');
    error.statusCode = 400;
    throw error;
  }

  const textoDescripcion =
    descripcion && String(descripcion).trim() !== ''
      ? String(descripcion).trim()
      : 'Consignación bancaria por ventanilla administrativa';

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const cuenta = await CuentasModel.obtenerPorNumeroParaTransaccion(connection, cuentaLimpiada);
    if (!cuenta) {
      const error = new Error(`La cuenta N.° ${cuentaLimpiada} no existe en el sistema.`);
      error.statusCode = 404;
      throw error;
    }

    if (cuenta.estado_cuenta !== 'ACTIVO' || cuenta.estado_usuario !== 'ACTIVO') {
      const error = new Error(
        `No se puede consignar: la cuenta N.° ${cuenta.numero_cuenta} se encuentra en estado ${
          cuenta.estado_cuenta !== 'ACTIVO' ? cuenta.estado_cuenta : cuenta.estado_usuario
        }.`
      );
      error.statusCode = 400;
      throw error;
    }

    const saldoAnterior = Number(cuenta.saldo);
    const nuevoSaldo = Number((saldoAnterior + monto).toFixed(2));

    // 1. Incrementar saldo en la cuenta
    await CuentasModel.actualizarSaldoEnTransaccion(connection, cuenta.id, nuevoSaldo);

    // 2. Registrar movimiento financiero
    const movimientoId = await MovimientosModel.crearEnTransaccion(connection, {
      cuenta_id: cuenta.id,
      tipo_movimiento: 'CONSIGNACION',
      descripcion: textoDescripcion,
      valor: monto,
      saldo_resultante: nuevoSaldo
    });

    await connection.commit();

    return {
      movimiento_id: movimientoId,
      cuenta_id: cuenta.id,
      numero_cuenta: cuenta.numero_cuenta,
      titular_nombre: cuenta.titular_nombre,
      valor_consignado: monto,
      saldo_anterior: saldoAnterior,
      nuevo_saldo: nuevoSaldo,
      descripcion: textoDescripcion,
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
 * Consulta el historial general de movimientos de todas las cuentas del banco.
 */
async function obtenerHistorialGeneralMovimientos(tipo = null) {
  return await MovimientosModel.listarTodos(tipo, 200);
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
  obtenerHistorialGeneralMovimientos
};
