const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/admin.controller');
const { verificarAdmin } = require('../middlewares/auth.middleware');

// Todas las rutas del Módulo Administrativo requieren sesión activa con rol ADMIN
router.use(verificarAdmin);

// Dashboard de indicadores globales
router.get('/dashboard', AdminController.obtenerDashboard);

// Gestión de clientes (Listar/Buscar, Crear, Ver Detalle, Editar, Cambiar Estado)
router.get('/clientes', AdminController.listarClientes);
router.post('/clientes', AdminController.crearCliente);
router.get('/clientes/:id', AdminController.obtenerDetalleCliente);
router.put('/clientes/:id', AdminController.editarCliente);
router.patch('/clientes/:id/estado', AdminController.cambiarEstadoCliente);

// Consulta general de cuentas bancarias y saldos
router.get('/cuentas', AdminController.listarCuentas);

// Realizar consignaciones bancarias
router.post('/consignaciones', AdminController.realizarConsignacion);

// Consultar historial general de movimientos del banco
router.get('/movimientos', AdminController.listarMovimientosGenerales);

module.exports = router;
