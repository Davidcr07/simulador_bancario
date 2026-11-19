// Lógica Frontend del Cajero Automático NovaATM (Con soporte para teclado físico y Pinpad en pantalla)

const alertaCajero = document.getElementById('alertaCajero');
const vistaLoginCajero = document.getElementById('vistaLoginCajero');
const vistaMenuCajero = document.getElementById('vistaMenuCajero');
const headerInfoCuenta = document.getElementById('headerInfoCuenta');
const badgeCuentaActiva = document.getElementById('badgeCuentaActiva');

const formLoginCajero = document.getElementById('formLoginCajero');
const inputNumeroCuenta = document.getElementById('numeroCuenta');
const inputPinCajero = document.getElementById('pinCajero');
const indicadorCampoPinpad = document.getElementById('indicadorCampoPinpad');

const nombreTitularCajero = document.getElementById('nombreTitularCajero');
const detalleCuentaCajero = document.getElementById('detalleCuentaCajero');

// Pestañas del cajero
const tabBtnSaldo = document.getElementById('tabBtnSaldo');
const tabBtnRetiro = document.getElementById('tabBtnRetiro');
const tabBtnMovimientos = document.getElementById('tabBtnMovimientos');

const subvistaSaldo = document.getElementById('subvistaSaldo');
const subvistaRetiro = document.getElementById('subvistaRetiro');
const subvistaMovimientos = document.getElementById('subvistaMovimientos');

// Elementos de Saldo
const textoSaldoDisponible = document.getElementById('textoSaldoDisponible');
const textoDetalleEstadoCuenta = document.getElementById('textoDetalleEstadoCuenta');
const btnRefrescarSaldo = document.getElementById('btnRefrescarSaldo');
const btnIrARetiroDesdeSaldo = document.getElementById('btnIrARetiroDesdeSaldo');

// Elementos de Retiro
const formRetiroCajero = document.getElementById('formRetiroCajero');
const inputValorRetiro = document.getElementById('valorRetiro');
const contenedorReciboVacio = document.getElementById('contenedorReciboVacio');
const contenedorReciboDatos = document.getElementById('contenedorReciboDatos');
const reciboId = document.getElementById('reciboId');
const reciboCuenta = document.getElementById('reciboCuenta');
const reciboSaldoAnterior = document.getElementById('reciboSaldoAnterior');
const reciboValorRetirado = document.getElementById('reciboValorRetirado');
const reciboNuevoSaldo = document.getElementById('reciboNuevoSaldo');

// Elementos de Movimientos
const badgeSaldoEnMovimientos = document.getElementById('badgeSaldoEnMovimientos');
const tablaMovimientosCajero = document.getElementById('tablaMovimientosCajero');

// Botones de cerrar operación
const btnCerrarOperacionTop = document.getElementById('btnCerrarOperacionTop');
const btnCerrarOperacionMenu = document.getElementById('btnCerrarOperacionMenu');

// Campo activo para el teclado numérico en pantalla (Pinpad)
let campoActivoPinpad = inputNumeroCuenta;

if (inputNumeroCuenta && inputPinCajero) {
  inputNumeroCuenta.addEventListener('focus', () => {
    campoActivoPinpad = inputNumeroCuenta;
    if (indicadorCampoPinpad) indicadorCampoPinpad.textContent = 'Campo: Número de Cuenta';
  });

  inputPinCajero.addEventListener('focus', () => {
    campoActivoPinpad = inputPinCajero;
    if (indicadorCampoPinpad) indicadorCampoPinpad.textContent = 'Campo: Clave PIN';
  });
}

// Eventos de las teclas del Pinpad en pantalla
document.querySelectorAll('.btn-pinpad').forEach((btn) => {
  btn.addEventListener('click', () => {
    const digito = btn.getAttribute('data-key');
    if (!campoActivoPinpad) campoActivoPinpad = inputNumeroCuenta;

    if (campoActivoPinpad === inputPinCajero && inputPinCajero.value.length >= 6) {
      return;
    }
    campoActivoPinpad.value += digito;
    campoActivoPinpad.focus();
  });
});

const btnPinpadBorrar = document.getElementById('btnPinpadBorrar');
if (btnPinpadBorrar) {
  btnPinpadBorrar.addEventListener('click', () => {
    if (!campoActivoPinpad) return;
    campoActivoPinpad.value = campoActivoPinpad.value.slice(0, -1);
    campoActivoPinpad.focus();
  });
}

const btnPinpadLimpiar = document.getElementById('btnPinpadLimpiar');
if (btnPinpadLimpiar) {
  btnPinpadLimpiar.addEventListener('click', () => {
    if (!campoActivoPinpad) return;
    campoActivoPinpad.value = '';
    campoActivoPinpad.focus();
  });
}

// Formateador de moneda en pesos ($)
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
  alertaCajero.className = `alert alert-${tipo} small`;
  alertaCajero.textContent = mensaje;
  alertaCajero.classList.remove('d-none');
}

function ocultarAlerta() {
  alertaCajero.classList.add('d-none');
}

function cambiarSubvista(subvista) {
  ocultarAlerta();
  subvistaSaldo.classList.add('d-none');
  subvistaRetiro.classList.add('d-none');
  subvistaMovimientos.classList.add('d-none');

  tabBtnSaldo.classList.remove('active');
  tabBtnRetiro.classList.remove('active');
  tabBtnMovimientos.classList.remove('active');

  if (subvista === 'saldo') {
    subvistaSaldo.classList.remove('d-none');
    tabBtnSaldo.classList.add('active');
    cargarSaldo();
  } else if (subvista === 'retiro') {
    subvistaRetiro.classList.remove('d-none');
    tabBtnRetiro.classList.add('active');
  } else if (subvista === 'movimientos') {
    subvistaMovimientos.classList.remove('d-none');
    tabBtnMovimientos.classList.add('active');
    cargarUltimosMovimientos();
  }
}

// Consulta el saldo disponible desde el backend
async function cargarSaldo() {
  try {
    const res = await fetch('/api/cajero/saldo');
    const data = await res.json();

    if (!res.ok || !data.ok) {
      mostrarVistaLogin();
      mostrarAlerta('danger', data.mensaje || 'Sesión de cajero finalizada.');
      return;
    }

    const { cuenta } = data;
    nombreTitularCajero.textContent = cuenta.titular_nombre;
    detalleCuentaCajero.textContent = `Cuenta de ${cuenta.tipo_cuenta} N.° ${cuenta.numero_cuenta}`;
    badgeCuentaActiva.textContent = `Cuenta N.° ${cuenta.numero_cuenta}`;
    textoSaldoDisponible.textContent = formatearMoneda(cuenta.saldo);
    textoDetalleEstadoCuenta.textContent = `Producto: Cuenta de ${cuenta.tipo_cuenta} • Estado: ${cuenta.estado}`;
  } catch (error) {
    mostrarAlerta('danger', 'Error al consultar el saldo en el servidor.');
  }
}

// Consulta los últimos movimientos desde el backend
async function cargarUltimosMovimientos() {
  try {
    const res = await fetch('/api/cajero/movimientos');
    const data = await res.json();

    if (!res.ok || !data.ok) {
      mostrarAlerta('danger', data.mensaje || 'No se pudieron cargar los movimientos.');
      return;
    }

    badgeSaldoEnMovimientos.textContent = `Saldo Disponible: ${formatearMoneda(data.cuenta.saldo)}`;

    if (!data.movimientos || data.movimientos.length === 0) {
      tablaMovimientosCajero.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted py-3">No hay movimientos registrados en esta cuenta.</td>
        </tr>
      `;
      return;
    }

    tablaMovimientosCajero.innerHTML = data.movimientos
      .map((m) => {
        const esSalida = m.tipo_movimiento === 'RETIRO_CAJERO' || m.tipo_movimiento === 'TRANSFERENCIA_ENVIADA';
        const signo = esSalida ? '-' : '+';
        const claseColor = esSalida ? 'text-danger fw-bold' : 'text-success fw-bold';
        return `
          <tr>
            <td class="small">${formatearFecha(m.fecha)}</td>
            <td><span class="badge bg-secondary">${m.tipo_movimiento}</span></td>
            <td>${m.descripcion}</td>
            <td class="text-end ${claseColor}">${signo}${formatearMoneda(m.valor)}</td>
            <td class="text-end fw-semibold">${formatearMoneda(m.saldo_resultante)}</td>
          </tr>
        `;
      })
      .join('');
  } catch (error) {
    mostrarAlerta('danger', 'Error de conexión al cargar los movimientos.');
  }
}

function mostrarVistaMenu() {
  vistaLoginCajero.classList.add('d-none');
  vistaMenuCajero.classList.remove('d-none');
  headerInfoCuenta.classList.remove('d-none');
  cambiarSubvista('saldo');
}

function mostrarVistaLogin() {
  vistaMenuCajero.classList.add('d-none');
  headerInfoCuenta.classList.add('d-none');
  vistaLoginCajero.classList.remove('d-none');
  formLoginCajero.reset();
  formRetiroCajero.reset();
  campoActivoPinpad = inputNumeroCuenta;
  if (indicadorCampoPinpad) indicadorCampoPinpad.textContent = 'Campo: Número de Cuenta';
  contenedorReciboDatos.classList.add('d-none');
  contenedorReciboVacio.classList.remove('d-none');
}

// Botones de monto rápido para retiro
document.querySelectorAll('.btn-monto-rapido').forEach((btn) => {
  btn.addEventListener('click', () => {
    inputValorRetiro.value = btn.getAttribute('data-monto');
  });
});

// Inicio de sesión en el cajero
formLoginCajero.addEventListener('submit', async (e) => {
  e.preventDefault();
  ocultarAlerta();

  const numero_cuenta = inputNumeroCuenta.value.trim();
  const pin = inputPinCajero.value.trim();

  if (!numero_cuenta || !pin) {
    mostrarAlerta('warning', 'Por favor digite su número de cuenta y su clave PIN.');
    return;
  }

  try {
    const res = await fetch('/api/auth/cajero', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero_cuenta, pin })
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      mostrarAlerta('danger', data.mensaje || 'No fue posible validar sus credenciales.');
      return;
    }

    mostrarVistaMenu();
  } catch (error) {
    mostrarAlerta('danger', 'Error de conexión con la red de cajeros.');
  }
});

// Realizar retiro
formRetiroCajero.addEventListener('submit', async (e) => {
  e.preventDefault();
  ocultarAlerta();

  const valor = Number(inputValorRetiro.value);
  if (!Number.isFinite(valor) || valor <= 0) {
    mostrarAlerta('warning', 'Ingrese un valor válido mayor que cero.');
    return;
  }

  try {
    const res = await fetch('/api/cajero/retiro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valor,
        descripcion: 'Retiro cajero'
      })
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      mostrarAlerta('danger', data.mensaje || 'No se pudo procesar el retiro.');
      return;
    }

    const r = data.retiro;
    mostrarAlerta(
      'success',
      `Transacción aprobada: Retiro por ${formatearMoneda(r.valor_retirado)}. Nuevo saldo disponible: ${formatearMoneda(r.nuevo_saldo)}.`
    );

    // Actualizar comprobante digital
    contenedorReciboVacio.classList.add('d-none');
    contenedorReciboDatos.classList.remove('d-none');
    reciboId.textContent = `#${r.movimiento_id}`;
    reciboCuenta.textContent = r.numero_cuenta;
    reciboSaldoAnterior.textContent = formatearMoneda(r.saldo_anterior);
    reciboValorRetirado.textContent = `-${formatearMoneda(r.valor_retirado)}`;
    reciboNuevoSaldo.textContent = formatearMoneda(r.nuevo_saldo);

    // Actualizar saldo en la tarjeta principal
    textoSaldoDisponible.textContent = formatearMoneda(r.nuevo_saldo);
    inputValorRetiro.value = '';
  } catch (error) {
    mostrarAlerta('danger', 'Error de conexión al procesar el retiro.');
  }
});

// Cerrar operación en el cajero
async function cerrarOperacionCajero() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modulo: 'cajero' })
    });
  } finally {
    mostrarVistaLogin();
    mostrarAlerta('info', 'Gracias por utilizar los cajeros NovaATM. Su sesión ha finalizado.');
  }
}

tabBtnSaldo.addEventListener('click', () => cambiarSubvista('saldo'));
tabBtnRetiro.addEventListener('click', () => cambiarSubvista('retiro'));
tabBtnMovimientos.addEventListener('click', () => cambiarSubvista('movimientos'));
btnRefrescarSaldo.addEventListener('click', () => cargarSaldo());
btnIrARetiroDesdeSaldo.addEventListener('click', () => cambiarSubvista('retiro'));
btnCerrarOperacionTop.addEventListener('click', cerrarOperacionCajero);
btnCerrarOperacionMenu.addEventListener('click', cerrarOperacionCajero);

// Verificar al abrir la página si ya había una sesión activa de cajero
(async function inicializarCajero() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.ok && data.cajero) {
      mostrarVistaMenu();
    }
  } catch (err) {
    console.error(err);
  }
})();
