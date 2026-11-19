// Lógica Frontend del Módulo 2: Consola Central de Administración (NovaBank)

const alertaAdmin = document.getElementById('alertaAdmin');
const navNombreAdmin = document.getElementById('navNombreAdmin');
const navCorreoAdmin = document.getElementById('navCorreoAdmin');
const btnRefrescarTodoAdmin = document.getElementById('btnRefrescarTodoAdmin');
const btnCerrarSesionAdmin = document.getElementById('btnCerrarSesionAdmin');

// KPIs del Dashboard
const kpiTotalClientes = document.getElementById('kpiTotalClientes');
const kpiClientesActivos = document.getElementById('kpiClientesActivos');
const kpiClientesBloqueados = document.getElementById('kpiClientesBloqueados');
const kpiSumaSaldos = document.getElementById('kpiSumaSaldos');

// Secciones / Pestañas
const tabClientes = document.getElementById('tabClientes');
const tabCuentas = document.getElementById('tabCuentas');
const tabConsignaciones = document.getElementById('tabConsignaciones');
const tabMovimientos = document.getElementById('tabMovimientos');

// Elementos de Gestión de Clientes
const inputBuscarCliente = document.getElementById('inputBuscarCliente');
const btnLimpiarBusqueda = document.getElementById('btnLimpiarBusqueda');
const tablaClientesAdmin = document.getElementById('tablaClientesAdmin');
const formCrearCliente = document.getElementById('formCrearCliente');
const formEditarCliente = document.getElementById('formEditarCliente');

// Elementos de Cuentas
const tablaCuentasAdmin = document.getElementById('tablaCuentasAdmin');

// Elementos de Consignaciones
const formConsignacionAdmin = document.getElementById('formConsignacionAdmin');
const selectCuentaConsignacion = document.getElementById('selectCuentaConsignacion');
const inputCuentaConsignacion = document.getElementById('inputCuentaConsignacion');
const inputValorConsignacion = document.getElementById('inputValorConsignacion');
const inputDescripcionConsignacion = document.getElementById('inputDescripcionConsignacion');
const compConsigVacio = document.getElementById('compConsigVacio');
const compConsigDatos = document.getElementById('compConsigDatos');

// Elementos de Historial General de Movimientos
const filtroTipoMovGeneral = document.getElementById('filtroTipoMovGeneral');
const tablaMovimientosGenerales = document.getElementById('tablaMovimientosGenerales');

let clientesCache = [];

function formatearMoneda(valor) {
  const numero = Number(valor) || 0;
  return '$' + numero.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatearFecha(fechaIso) {
  if (!fechaIso) return '—';
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
  alertaAdmin.className = `alert alert-${tipo} small shadow-sm`;
  alertaAdmin.textContent = mensaje;
  alertaAdmin.classList.remove('d-none');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function ocultarAlerta() {
  alertaAdmin.classList.add('d-none');
}

function badgeEstado(estado) {
  if (estado === 'ACTIVO') return '<span class="badge bg-success-subtle text-success">ACTIVO</span>';
  if (estado === 'BLOQUEADO') return '<span class="badge bg-danger-subtle text-danger">BLOQUEADO</span>';
  return '<span class="badge bg-secondary-subtle text-secondary">INACTIVO</span>';
}

function badgeTipoMovimiento(tipo) {
  switch (tipo) {
    case 'CONSIGNACION':
      return '<span class="badge bg-success-subtle text-success">CONSIGNACIÓN</span>';
    case 'RETIRO_CAJERO':
      return '<span class="badge bg-warning-subtle text-warning-emphasis">RETIRO CAJERO</span>';
    case 'TRANSFERENCIA_ENVIADA':
      return '<span class="badge bg-danger-subtle text-danger">TRANSF. ENVIADA</span>';
    case 'TRANSFERENCIA_RECIBIDA':
      return '<span class="badge bg-primary-subtle text-primary">TRANSF. RECIBIDA</span>';
    default:
      return `<span class="badge bg-secondary">${tipo}</span>`;
  }
}

// Cambiar pestaña activa
function cambiarPestanaAdmin(nombreTab) {
  ocultarAlerta();
  tabClientes.classList.add('d-none');
  tabCuentas.classList.add('d-none');
  tabConsignaciones.classList.add('d-none');
  tabMovimientos.classList.add('d-none');

  document.querySelectorAll('#menuPestanasAdmin .nav-link').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === nombreTab);
  });

  if (nombreTab === 'clientes') {
    tabClientes.classList.remove('d-none');
    cargarClientes();
  } else if (nombreTab === 'cuentas') {
    tabCuentas.classList.remove('d-none');
    cargarCuentas();
  } else if (nombreTab === 'consignaciones') {
    tabConsignaciones.classList.remove('d-none');
    cargarCuentasParaSelect();
  } else if (nombreTab === 'movimientos') {
    tabMovimientos.classList.remove('d-none');
    cargarMovimientosGenerales();
  }
}

document.querySelectorAll('#menuPestanasAdmin .nav-link').forEach((btn) => {
  btn.addEventListener('click', () => {
    cambiarPestanaAdmin(btn.getAttribute('data-tab'));
  });
});

// Verificar sesión de administrador
async function verificarSesionAdmin() {
  const res = await fetch('/api/auth/me');
  const data = await res.json();
  if (!data.ok || !data.usuario || data.usuario.rol !== 'ADMIN') {
    window.location.href = '/admin/login.html';
    return false;
  }
  navNombreAdmin.textContent = data.usuario.nombre_completo;
  navCorreoAdmin.textContent = data.usuario.correo;
  return true;
}

// Cargar los 4 indicadores del Dashboard Administrativo
async function cargarMetricasDashboard() {
  try {
    const res = await fetch('/api/admin/dashboard');
    const data = await res.json();
    if (!res.ok || !data.ok) return;

    const m = data.metricas;
    kpiTotalClientes.textContent = m.total_clientes;
    kpiClientesActivos.textContent = m.clientes_activos;
    kpiClientesBloqueados.textContent = m.clientes_bloqueados;
    kpiSumaSaldos.textContent = formatearMoneda(m.suma_total_saldos);
  } catch (err) {
    console.error(err);
  }
}

// Listar y buscar clientes
async function cargarClientes(busqueda = '') {
  try {
    const url = busqueda
      ? `/api/admin/clientes?q=${encodeURIComponent(busqueda)}`
      : '/api/admin/clientes';
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || !data.ok) {
      mostrarAlerta('danger', data.mensaje || 'Error al cargar los clientes.');
      return;
    }

    clientesCache = data.clientes || [];

    if (clientesCache.length === 0) {
      tablaClientesAdmin.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted py-4">No se encontraron clientes registrados.</td>
        </tr>
      `;
      return;
    }

    tablaClientesAdmin.innerHTML = clientesCache
      .map((c) => {
        return `
          <tr>
            <td class="fw-semibold">${c.documento}</td>
            <td>${c.nombre_completo}</td>
            <td class="small text-secondary">${c.correo}</td>
            <td>
              <span class="fw-bold text-primary">${c.numero_cuenta || '—'}</span>
              <span class="badge bg-light text-dark border ms-1">${c.tipo_cuenta || ''}</span>
            </td>
            <td class="text-end fw-bold">${formatearMoneda(c.saldo)}</td>
            <td>${badgeEstado(c.estado)}</td>
            <td class="text-end">
              <div class="btn-group btn-group-sm">
                <button
                  type="button"
                  class="btn btn-outline-primary"
                  onclick="verDetalleCliente(${c.id})"
                  title="Ver ficha detallada"
                >
                  <i class="bi bi-eye"></i>
                </button>
                <button
                  type="button"
                  class="btn btn-outline-dark"
                  onclick="abrirModalEditarCliente(${c.id})"
                  title="Editar datos"
                >
                  <i class="bi bi-pencil"></i>
                </button>
                ${
                  c.estado === 'ACTIVO'
                    ? `<button type="button" class="btn btn-outline-danger" onclick="cambiarEstado(${c.id}, 'BLOQUEADO')" title="Bloquear cliente">
                         <i class="bi bi-lock-fill"></i> Bloquear
                       </button>
                       <button type="button" class="btn btn-outline-secondary" onclick="cambiarEstado(${c.id}, 'INACTIVO')" title="Marcar Inactivo">
                         Inactivar
                       </button>`
                    : `<button type="button" class="btn btn-outline-success" onclick="cambiarEstado(${c.id}, 'ACTIVO')" title="Habilitar cliente">
                         <i class="bi bi-unlock-fill"></i> Habilitar
                       </button>`
                }
              </div>
            </td>
          </tr>
        `;
      })
      .join('');
  } catch (error) {
    mostrarAlerta('danger', 'Error de conexión al listar clientes.');
  }
}

// Buscador en tiempo real
let timeoutBusqueda = null;
inputBuscarCliente.addEventListener('input', () => {
  clearTimeout(timeoutBusqueda);
  timeoutBusqueda = setTimeout(() => {
    cargarClientes(inputBuscarCliente.value.trim());
  }, 220);
});

btnLimpiarBusqueda.addEventListener('click', () => {
  inputBuscarCliente.value = '';
  cargarClientes('');
});

// Crear nuevo cliente
formCrearCliente.addEventListener('submit', async (e) => {
  e.preventDefault();
  ocultarAlerta();

  const payload = {
    documento: document.getElementById('crearDocumento').value.trim(),
    nombre_completo: document.getElementById('crearNombre').value.trim(),
    correo: document.getElementById('crearCorreo').value.trim(),
    password: document.getElementById('crearPassword').value,
    telefono: document.getElementById('crearTelefono').value.trim(),
    direccion: document.getElementById('crearDireccion').value.trim(),
    tipo_cuenta: document.getElementById('crearTipoCuenta').value,
    pin: document.getElementById('crearPin').value.trim(),
    saldo_inicial: Number(document.getElementById('crearSaldoInicial').value || 0)
  };

  try {
    const res = await fetch('/api/admin/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      mostrarAlerta('danger', data.mensaje || 'No se pudo crear el cliente.');
      return;
    }

    const modalEl = document.getElementById('modalCrearCliente');
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();

    formCrearCliente.reset();
    mostrarAlerta('success', data.mensaje);
    await cargarMetricasDashboard();
    await cargarClientes();
  } catch (error) {
    mostrarAlerta('danger', 'Error de conexión al crear el cliente.');
  }
});

// Ver detalle completo de un cliente
window.verDetalleCliente = async function (clienteId) {
  try {
    const res = await fetch(`/api/admin/clientes/${clienteId}`);
    const data = await res.json();

    if (!res.ok || !data.ok) {
      mostrarAlerta('danger', data.mensaje || 'No se pudo cargar el detalle del cliente.');
      return;
    }

    const { cliente, movimientos } = data;
    document.getElementById('detNombre').textContent = cliente.nombre_completo;
    document.getElementById('detDocumento').textContent = cliente.documento;
    document.getElementById('detCorreo').textContent = cliente.correo;
    document.getElementById('detTelefono').textContent = cliente.telefono || 'Sin registrar';
    document.getElementById('detDireccion').textContent = cliente.direccion || 'Sin registrar';
    document.getElementById('detEstadoUsuario').innerHTML = badgeEstado(cliente.estado);

    document.getElementById('detNumeroCuenta').textContent = cliente.numero_cuenta || '—';
    document.getElementById('detTipoCuenta').textContent = cliente.tipo_cuenta || '—';
    document.getElementById('detSaldo').textContent = formatearMoneda(cliente.saldo);
    document.getElementById('detEstadoCuenta').innerHTML = badgeEstado(cliente.estado_cuenta);
    document.getElementById('detFechaApertura').textContent = formatearFecha(cliente.fecha_apertura);

    const tbody = document.getElementById('tablaDetalleMovimientosCliente');
    if (!movimientos || movimientos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Sin movimientos registrados.</td></tr>';
    } else {
      tbody.innerHTML = movimientos
        .map((m) => {
          const esSalida = m.tipo_movimiento === 'RETIRO_CAJERO' || m.tipo_movimiento === 'TRANSFERENCIA_ENVIADA';
          const signo = esSalida ? '-' : '+';
          const color = esSalida ? 'text-danger fw-bold' : 'text-success fw-bold';
          return `
            <tr>
              <td>${formatearFecha(m.fecha)}</td>
              <td>${badgeTipoMovimiento(m.tipo_movimiento)}</td>
              <td>${m.descripcion}</td>
              <td class="text-end ${color}">${signo}${formatearMoneda(m.valor)}</td>
              <td class="text-end fw-semibold">${formatearMoneda(m.saldo_resultante)}</td>
            </tr>
          `;
        })
        .join('');
    }

    const modal = new bootstrap.Modal(document.getElementById('modalDetalleCliente'));
    modal.show();
  } catch (error) {
    mostrarAlerta('danger', 'Error al consultar la ficha del cliente.');
  }
};

// Abrir modal para editar un cliente
window.abrirModalEditarCliente = function (clienteId) {
  const cliente = clientesCache.find((c) => c.id === clienteId);
  if (!cliente) return;

  document.getElementById('editClienteId').value = cliente.id;
  document.getElementById('editNombre').value = cliente.nombre_completo;
  document.getElementById('editCorreo').value = cliente.correo;
  document.getElementById('editTelefono').value = cliente.telefono || '';
  document.getElementById('editDireccion').value = cliente.direccion || '';
  document.getElementById('editTipoCuenta').value = cliente.tipo_cuenta || 'AHORROS';

  const modal = new bootstrap.Modal(document.getElementById('modalEditarCliente'));
  modal.show();
};

formEditarCliente.addEventListener('submit', async (e) => {
  e.preventDefault();
  ocultarAlerta();

  const clienteId = document.getElementById('editClienteId').value;
  const payload = {
    nombre_completo: document.getElementById('editNombre').value.trim(),
    correo: document.getElementById('editCorreo').value.trim(),
    telefono: document.getElementById('editTelefono').value.trim(),
    direccion: document.getElementById('editDireccion').value.trim(),
    tipo_cuenta: document.getElementById('editTipoCuenta').value
  };

  try {
    const res = await fetch(`/api/admin/clientes/${clienteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      mostrarAlerta('danger', data.mensaje || 'Error al actualizar el cliente.');
      return;
    }

    const modalEl = document.getElementById('modalEditarCliente');
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();

    mostrarAlerta('success', data.mensaje);
    await cargarClientes(inputBuscarCliente.value.trim());
  } catch (error) {
    mostrarAlerta('danger', 'Error de conexión al editar el cliente.');
  }
});

// Cambiar estado de cliente (ACTIVO / INACTIVO / BLOQUEADO)
window.cambiarEstado = async function (clienteId, nuevoEstado) {
  ocultarAlerta();
  try {
    const res = await fetch(`/api/admin/clientes/${clienteId}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado })
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      mostrarAlerta('danger', data.mensaje || 'No se pudo cambiar el estado del cliente.');
      return;
    }

    mostrarAlerta('success', data.mensaje);
    await cargarMetricasDashboard();
    await cargarClientes(inputBuscarCliente.value.trim());
  } catch (error) {
    mostrarAlerta('danger', 'Error de conexión al cambiar el estado.');
  }
};

// Cargar listado general de cuentas bancarias
async function cargarCuentas() {
  try {
    const res = await fetch('/api/admin/cuentas');
    const data = await res.json();

    if (!res.ok || !data.ok) {
      mostrarAlerta('danger', data.mensaje || 'Error al cargar las cuentas.');
      return;
    }

    const cuentas = data.cuentas || [];
    if (cuentas.length === 0) {
      tablaCuentasAdmin.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Sin cuentas registradas.</td></tr>';
      return;
    }

    tablaCuentasAdmin.innerHTML = cuentas
      .map((c) => {
        return `
          <tr>
            <td class="fw-bold text-primary">${c.numero_cuenta}</td>
            <td><span class="badge bg-light text-dark border">${c.tipo_cuenta}</span></td>
            <td>${c.titular_nombre}</td>
            <td>${c.titular_documento}</td>
            <td class="small text-secondary">${formatearFecha(c.fecha_apertura)}</td>
            <td>${badgeEstado(c.estado)}</td>
            <td class="text-end fw-bold fs-6">${formatearMoneda(c.saldo)}</td>
            <td class="text-end">
              <button
                type="button"
                class="btn btn-sm btn-outline-success fw-semibold"
                onclick="prepararConsignacion('${c.numero_cuenta}')"
              >
                <i class="bi bi-cash-coin me-1"></i> Consignar
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
  } catch (error) {
    mostrarAlerta('danger', 'Error al consultar las cuentas bancarias.');
  }
}

window.prepararConsignacion = function (numeroCuenta) {
  cambiarPestanaAdmin('consignaciones');
  inputCuentaConsignacion.value = numeroCuenta;
  selectCuentaConsignacion.value = numeroCuenta;
  inputValorConsignacion.focus();
};

async function cargarCuentasParaSelect() {
  try {
    const res = await fetch('/api/admin/cuentas');
    const data = await res.json();
    if (!res.ok || !data.ok) return;

    const activas = (data.cuentas || []).filter((c) => c.estado === 'ACTIVO');
    selectCuentaConsignacion.innerHTML =
      '<option value="">— Selecciona una cuenta activa o digítala abajo —</option>' +
      activas
        .map(
          (c) =>
            `<option value="${c.numero_cuenta}">Cuenta N.° ${c.numero_cuenta} (${c.tipo_cuenta}) — ${
              c.titular_nombre
            } [Saldo: ${formatearMoneda(c.saldo)}]</option>`
        )
        .join('');
  } catch (err) {
    console.error(err);
  }
}

selectCuentaConsignacion.addEventListener('change', () => {
  if (selectCuentaConsignacion.value) {
    inputCuentaConsignacion.value = selectCuentaConsignacion.value;
  }
});

// Realizar consignación bancaria
formConsignacionAdmin.addEventListener('submit', async (e) => {
  e.preventDefault();
  ocultarAlerta();

  const numero_cuenta = inputCuentaConsignacion.value.trim();
  const valor = Number(inputValorConsignacion.value);
  const descripcion = inputDescripcionConsignacion.value.trim();

  if (!numero_cuenta) {
    mostrarAlerta('warning', 'Selecciona o ingresa el número de cuenta destino.');
    return;
  }

  if (!Number.isFinite(valor) || valor <= 0) {
    mostrarAlerta('warning', 'El valor a consignar debe ser mayor que cero.');
    return;
  }

  try {
    const res = await fetch('/api/admin/consignaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numero_cuenta,
        valor,
        descripcion
      })
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      mostrarAlerta('danger', data.mensaje || 'No se pudo realizar la consignación.');
      return;
    }

    const c = data.consignacion;
    mostrarAlerta(
      'success',
      `Consignación exitosa de ${formatearMoneda(c.valor_consignado)} en la cuenta N.° ${c.numero_cuenta} (${c.titular_nombre}). Nuevo saldo: ${formatearMoneda(c.nuevo_saldo)}.`
    );

    compConsigVacio.classList.add('d-none');
    compConsigDatos.classList.remove('d-none');
    document.getElementById('compConsigId').textContent = `#${c.movimiento_id}`;
    document.getElementById('compConsigCuenta').textContent = c.numero_cuenta;
    document.getElementById('compConsigTitular').textContent = c.titular_nombre;
    document.getElementById('compConsigSaldoAnt').textContent = formatearMoneda(c.saldo_anterior);
    document.getElementById('compConsigValor').textContent = `+${formatearMoneda(c.valor_consignado)}`;
    document.getElementById('compConsigNuevoSaldo').textContent = formatearMoneda(c.nuevo_saldo);

    inputValorConsignacion.value = '';
    inputDescripcionConsignacion.value = '';

    await cargarMetricasDashboard();
    await cargarCuentasParaSelect();
  } catch (error) {
    mostrarAlerta('danger', 'Error de conexión al procesar la consignación.');
  }
});

// Cargar historial general de movimientos del banco
async function cargarMovimientosGenerales() {
  try {
    const tipo = filtroTipoMovGeneral.value;
    const res = await fetch(`/api/admin/movimientos?tipo=${encodeURIComponent(tipo)}`);
    const data = await res.json();

    if (!res.ok || !data.ok) {
      mostrarAlerta('danger', data.mensaje || 'Error al cargar los movimientos generales.');
      return;
    }

    const movimientos = data.movimientos || [];
    if (movimientos.length === 0) {
      tablaMovimientosGenerales.innerHTML =
        '<tr><td colspan="8" class="text-center text-muted py-4">No hay movimientos registrados para este filtro.</td></tr>';
      return;
    }

    tablaMovimientosGenerales.innerHTML = movimientos
      .map((m) => {
        const esSalida = m.tipo_movimiento === 'RETIRO_CAJERO' || m.tipo_movimiento === 'TRANSFERENCIA_ENVIADA';
        const signo = esSalida ? '-' : '+';
        const color = esSalida ? 'text-danger fw-bold' : 'text-success fw-bold';
        return `
          <tr>
            <td class="text-muted small">#${m.id}</td>
            <td class="small text-secondary">${formatearFecha(m.fecha)}</td>
            <td class="fw-bold text-primary">${m.numero_cuenta}</td>
            <td>${m.titular_nombre}</td>
            <td>${badgeTipoMovimiento(m.tipo_movimiento)}</td>
            <td>${m.descripcion}</td>
            <td class="text-end ${color}">${signo}${formatearMoneda(m.valor)}</td>
            <td class="text-end fw-bold">${formatearMoneda(m.saldo_resultante)}</td>
          </tr>
        `;
      })
      .join('');
  } catch (error) {
    mostrarAlerta('danger', 'Error al consultar el historial general de movimientos.');
  }
}

filtroTipoMovGeneral.addEventListener('change', cargarMovimientosGenerales);

btnRefrescarTodoAdmin.addEventListener('click', async () => {
  await cargarMetricasDashboard();
  await cargarClientes(inputBuscarCliente.value.trim());
  mostrarAlerta('info', 'Datos e indicadores sincronizados con MySQL.');
});

btnCerrarSesionAdmin.addEventListener('click', async () => {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modulo: 'usuario' })
    });
  } finally {
    window.location.href = '/admin/login.html';
  }
});

// Inicialización del Panel Administrativo
(async function inicializarConsolaAdmin() {
  const ok = await verificarSesionAdmin();
  if (!ok) return;
  await cargarMetricasDashboard();
  await cargarClientes();
})();
