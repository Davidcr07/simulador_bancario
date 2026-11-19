// Lógica Frontend del Módulo 1: Sucursal Virtual Personas (Banca Virtual del Cliente)

const alertaCliente = document.getElementById('alertaCliente');

// Elementos del encabezado y tarjeta de resumen
const navNombreCliente = document.getElementById('navNombreCliente');
const navDocumentoCliente = document.getElementById('navDocumentoCliente');
const cardTipoCuenta = document.getElementById('cardTipoCuenta');
const cardEstadoCuenta = document.getElementById('cardEstadoCuenta');
const cardSaldoDisponible = document.getElementById('cardSaldoDisponible');
const cardNumeroCuenta = document.getElementById('cardNumeroCuenta');
const headerNombreTitular = document.getElementById('headerNombreTitular');
const resumenCorreo = document.getElementById('resumenCorreo');
const resumenTelefono = document.getElementById('resumenTelefono');
const btnRefrescarResumen = document.getElementById('btnRefrescarResumen');
const btnCerrarSesionCliente = document.getElementById('btnCerrarSesionCliente');

// Vistas
const vistaMovimientos = document.getElementById('vistaMovimientos');
const vistaTransferencias = document.getElementById('vistaTransferencias');
const vistaPerfil = document.getElementById('vistaPerfil');
const vistaSeguridad = document.getElementById('vistaSeguridad');

// Tabla y filtro de movimientos
const tablaMovimientosCliente = document.getElementById('tablaMovimientosCliente');
const filtroTipoMovimiento = document.getElementById('filtroTipoMovimiento');
let listaMovimientosCache = [];

// Elementos de Transferencia
const formTransferencia = document.getElementById('formTransferencia');
const inputCuentaOrigenTransferencia = document.getElementById('inputCuentaOrigenTransferencia');
const inputCuentaDestino = document.getElementById('inputCuentaDestino');
const inputValorTransferencia = document.getElementById('inputValorTransferencia');
const inputDescripcionTransferencia = document.getElementById('inputDescripcionTransferencia');
const comprobanteTransfVacio = document.getElementById('comprobanteTransfVacio');
const comprobanteTransfDatos = document.getElementById('comprobanteTransfDatos');
const compTransfId = document.getElementById('compTransfId');
const compTransfOrigen = document.getElementById('compTransfOrigen');
const compTransfDestino = document.getElementById('compTransfDestino');
const compTransfDestinatario = document.getElementById('compTransfDestinatario');
const compTransfConcepto = document.getElementById('compTransfConcepto');
const compTransfValor = document.getElementById('compTransfValor');
const compTransfNuevoSaldo = document.getElementById('compTransfNuevoSaldo');

// Elementos de Perfil
const formPerfilCliente = document.getElementById('formPerfilCliente');
const perfilNombre = document.getElementById('perfilNombre');
const perfilCorreo = document.getElementById('perfilCorreo');
const perfilTelefono = document.getElementById('perfilTelefono');
const perfilDireccion = document.getElementById('perfilDireccion');
const perfilDocumentoReadonly = document.getElementById('perfilDocumentoReadonly');
const perfilCuentaReadonly = document.getElementById('perfilCuentaReadonly');
const perfilSaldoReadonly = document.getElementById('perfilSaldoReadonly');
const perfilEstadoRolReadonly = document.getElementById('perfilEstadoRolReadonly');

// Elementos de Cambio de Contraseña
const formCambiarPassword = document.getElementById('formCambiarPassword');
const inputPasswordActual = document.getElementById('inputPasswordActual');
const inputPasswordNueva = document.getElementById('inputPasswordNueva');
const inputPasswordConfirmacion = document.getElementById('inputPasswordConfirmacion');

function formatearMoneda(valor) {
  const numero = Number(valor) || 0;
  return '$' + numero.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatearFecha(fechaIso) {
  const fecha = new Date(fechaIso);
  return fecha.toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function mostrarAlerta(tipo, mensaje) {
  alertaCliente.className = `alert alert-${tipo} small shadow-sm`;
  alertaCliente.textContent = mensaje;
  alertaCliente.classList.remove('d-none');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function ocultarAlerta() {
  alertaCliente.classList.add('d-none');
}

function obtenerEtiquetaTipoMovimiento(tipo) {
  switch (tipo) {
    case 'CONSIGNACION':
      return '<span class="badge bg-success-subtle text-success">CONSIGNACIÓN</span>';
    case 'RETIRO_CAJERO':
      return '<span class="badge bg-warning-subtle text-warning-emphasis">RETIRO CAJERO</span>';
    case 'TRANSFERENCIA_ENVIADA':
      return '<span class="badge bg-danger-subtle text-danger">TRANSFERENCIA ENVIADA</span>';
    case 'TRANSFERENCIA_RECIBIDA':
      return '<span class="badge bg-primary-subtle text-primary">TRANSFERENCIA RECIBIDA</span>';
    default:
      return `<span class="badge bg-secondary">${tipo}</span>`;
  }
}

// Cambiar entre las 4 pestañas de la Banca Virtual
function cambiarVista(nombreVista) {
  ocultarAlerta();
  vistaMovimientos.classList.add('d-none');
  vistaTransferencias.classList.add('d-none');
  vistaPerfil.classList.add('d-none');
  vistaSeguridad.classList.add('d-none');

  document.querySelectorAll('#menuPestanasCliente .nav-link').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-vista') === nombreVista);
  });

  if (nombreVista === 'movimientos') {
    vistaMovimientos.classList.remove('d-none');
    cargarMovimientos();
  } else if (nombreVista === 'transferencias') {
    vistaTransferencias.classList.remove('d-none');
  } else if (nombreVista === 'perfil') {
    vistaPerfil.classList.remove('d-none');
  } else if (nombreVista === 'seguridad') {
    vistaSeguridad.classList.remove('d-none');
  }
}

document.querySelectorAll('#menuPestanasCliente .nav-link').forEach((btn) => {
  btn.addEventListener('click', () => {
    cambiarVista(btn.getAttribute('data-vista'));
  });
});

// Carga el resumen de la cuenta y datos personales del cliente
async function cargarResumenCliente() {
  try {
    const res = await fetch('/api/cliente/resumen');
    const data = await res.json();

    if (!res.ok || !data.ok) {
      window.location.href = '/cliente/login.html';
      return;
    }

    const { perfil, cuenta } = data;

    navNombreCliente.textContent = perfil.nombre_completo;
    navDocumentoCliente.textContent = `Doc: ${perfil.documento}`;
    headerNombreTitular.textContent = perfil.nombre_completo;
    resumenCorreo.textContent = perfil.correo;
    resumenTelefono.textContent = perfil.telefono || 'Sin registrar';

    cardTipoCuenta.textContent = `CUENTA DE ${cuenta.tipo_cuenta}`;
    cardEstadoCuenta.textContent = cuenta.estado;
    cardSaldoDisponible.textContent = formatearMoneda(cuenta.saldo);
    cardNumeroCuenta.textContent = `N.° ${cuenta.numero_cuenta}`;

    inputCuentaOrigenTransferencia.value = `Cuenta de ${cuenta.tipo_cuenta} N.° ${cuenta.numero_cuenta} — Saldo disponible: ${formatearMoneda(cuenta.saldo)}`;

    // Llenar formulario de perfil y campos protegidos
    perfilNombre.value = perfil.nombre_completo;
    perfilCorreo.value = perfil.correo;
    perfilTelefono.value = perfil.telefono || '';
    perfilDireccion.value = perfil.direccion || '';

    perfilDocumentoReadonly.value = perfil.documento;
    perfilCuentaReadonly.value = `${cuenta.numero_cuenta} (${cuenta.tipo_cuenta})`;
    perfilSaldoReadonly.value = formatearMoneda(cuenta.saldo);
    perfilEstadoRolReadonly.value = `${cuenta.estado} / ${perfil.rol}`;
  } catch (error) {
    mostrarAlerta('danger', 'No se pudo cargar el resumen de la cuenta.');
  }
}

// Renderiza la tabla de movimientos aplicando el filtro seleccionado
function renderizarTablaMovimientos() {
  const filtro = filtroTipoMovimiento.value;
  const filtrados =
    filtro === 'TODOS'
      ? listaMovimientosCache
      : listaMovimientosCache.filter((m) => m.tipo_movimiento === filtro);

  if (filtrados.length === 0) {
    tablaMovimientosCliente.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted py-4">
          No se encontraron movimientos para el criterio seleccionado.
        </td>
      </tr>
    `;
    return;
  }

  tablaMovimientosCliente.innerHTML = filtrados
    .map((m) => {
      const esSalida = m.tipo_movimiento === 'RETIRO_CAJERO' || m.tipo_movimiento === 'TRANSFERENCIA_ENVIADA';
      const signo = esSalida ? '-' : '+';
      const claseColor = esSalida ? 'text-danger fw-bold' : 'text-success fw-bold';

      return `
        <tr>
          <td class="small text-secondary">${formatearFecha(m.fecha)}</td>
          <td>${obtenerEtiquetaTipoMovimiento(m.tipo_movimiento)}</td>
          <td>${m.descripcion}</td>
          <td class="text-end ${claseColor}">${signo}${formatearMoneda(m.valor)}</td>
          <td class="text-end fw-bold">${formatearMoneda(m.saldo_resultante)}</td>
        </tr>
      `;
    })
    .join('');
}

// Consulta el historial completo de movimientos desde el backend
async function cargarMovimientos() {
  try {
    const res = await fetch('/api/cliente/movimientos');
    const data = await res.json();

    if (!res.ok || !data.ok) {
      mostrarAlerta('danger', data.mensaje || 'Error al cargar el historial de movimientos.');
      return;
    }

    listaMovimientosCache = data.movimientos || [];
    cardSaldoDisponible.textContent = formatearMoneda(data.cuenta.saldo);
    renderizarTablaMovimientos();
  } catch (error) {
    mostrarAlerta('danger', 'Error de conexión al consultar los movimientos.');
  }
}

filtroTipoMovimiento.addEventListener('change', renderizarTablaMovimientos);

// Enviar transferencia hacia otra cuenta
formTransferencia.addEventListener('submit', async (e) => {
  e.preventDefault();
  ocultarAlerta();

  const numero_cuenta_destino = inputCuentaDestino.value.trim();
  const valor = Number(inputValorTransferencia.value);
  const descripcion = inputDescripcionTransferencia.value.trim();

  if (!numero_cuenta_destino) {
    mostrarAlerta('warning', 'Por favor ingresa el número de la cuenta destino.');
    return;
  }

  if (!Number.isFinite(valor) || valor <= 0) {
    mostrarAlerta('warning', 'El valor a transferir debe ser mayor que cero.');
    return;
  }

  try {
    const res = await fetch('/api/cliente/transferir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numero_cuenta_destino,
        valor,
        descripcion
      })
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      mostrarAlerta('danger', data.mensaje || 'No se pudo completar la transferencia.');
      return;
    }

    const t = data.transferencia;
    mostrarAlerta(
      'success',
      `Transferencia exitosa de ${formatearMoneda(t.valor_transferido)} hacia la cuenta N.° ${t.cuenta_destino} (${t.destinatario_nombre}).`
    );

    comprobanteTransfVacio.classList.add('d-none');
    comprobanteTransfDatos.classList.remove('d-none');
    compTransfId.textContent = `#${t.transferencia_id}`;
    compTransfOrigen.textContent = t.cuenta_origen;
    compTransfDestino.textContent = t.cuenta_destino;
    compTransfDestinatario.textContent = t.destinatario_nombre;
    compTransfConcepto.textContent = t.descripcion;
    compTransfValor.textContent = `-${formatearMoneda(t.valor_transferido)}`;
    compTransfNuevoSaldo.textContent = formatearMoneda(t.nuevo_saldo);

    inputCuentaDestino.value = '';
    inputValorTransferencia.value = '';
    inputDescripcionTransferencia.value = '';

    await cargarResumenCliente();
    await cargarMovimientos();
  } catch (error) {
    mostrarAlerta('danger', 'Error de conexión al procesar la transferencia.');
  }
});

// Actualizar datos permitidos del perfil
formPerfilCliente.addEventListener('submit', async (e) => {
  e.preventDefault();
  ocultarAlerta();

  const nombre_completo = perfilNombre.value.trim();
  const correo = perfilCorreo.value.trim();
  const telefono = perfilTelefono.value.trim();
  const direccion = perfilDireccion.value.trim();

  if (!nombre_completo || !correo) {
    mostrarAlerta('warning', 'El nombre completo y el correo electrónico son obligatorios.');
    return;
  }

  try {
    const res = await fetch('/api/cliente/perfil', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre_completo,
        correo,
        telefono,
        direccion
      })
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      mostrarAlerta('danger', data.mensaje || 'No se pudo actualizar el perfil.');
      return;
    }

    mostrarAlerta('success', data.mensaje);
    await cargarResumenCliente();
  } catch (error) {
    mostrarAlerta('danger', 'Error de conexión al actualizar el perfil.');
  }
});

// Cambiar contraseña del cliente
formCambiarPassword.addEventListener('submit', async (e) => {
  e.preventDefault();
  ocultarAlerta();

  const password_actual = inputPasswordActual.value;
  const password_nueva = inputPasswordNueva.value;
  const password_confirmacion = inputPasswordConfirmacion.value;

  if (!password_actual || !password_nueva || !password_confirmacion) {
    mostrarAlerta('warning', 'Completa todos los campos para cambiar tu contraseña.');
    return;
  }

  try {
    const res = await fetch('/api/cliente/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password_actual,
        password_nueva,
        password_confirmacion
      })
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      mostrarAlerta('danger', data.mensaje || 'No se pudo cambiar la contraseña.');
      return;
    }

    formCambiarPassword.reset();
    mostrarAlerta('success', data.mensaje);
  } catch (error) {
    mostrarAlerta('danger', 'Error de conexión al cambiar la contraseña.');
  }
});

btnRefrescarResumen.addEventListener('click', async () => {
  await cargarResumenCliente();
  await cargarMovimientos();
  mostrarAlerta('info', 'Información de cuenta y movimientos actualizada.');
});

btnCerrarSesionCliente.addEventListener('click', async () => {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modulo: 'usuario' })
    });
  } finally {
    window.location.href = '/cliente/login.html';
  }
});

// Inicializar vista del panel del cliente
(async function inicializarDashboardCliente() {
  await cargarResumenCliente();
  await cargarMovimientos();
})();
