const express = require('express');
const router = express.Router();
const ClienteController = require('../controllers/cliente.controller');
const { verificarCliente } = require('../middlewares/auth.middleware');

// Todas las rutas de la Banca Virtual están protegidas por sesión y rol CLIENTE activo
router.use(verificarCliente);

// Consultar saldo, número/tipo de cuenta e información personal
router.get('/resumen', ClienteController.obtenerResumen);

// Consultar historial completo de movimientos de la cuenta
router.get('/movimientos', ClienteController.obtenerMovimientos);

// Realizar transferencia hacia otra cuenta registrada
router.post('/transferir', ClienteController.realizarTransferencia);

// Modificar datos permitidos del perfil
router.put('/perfil', ClienteController.actualizarPerfil);

// Cambiar contraseña de acceso
router.put('/password', ClienteController.cambiarPassword);

module.exports = router;
