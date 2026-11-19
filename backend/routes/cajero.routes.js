const express = require('express');
const router = express.Router();
const CajeroController = require('../controllers/cajero.controller');
const { verificarCajero } = require('../middlewares/auth.middleware');

// Todas las rutas del cajero requieren sesión activa de cajero (Número de cuenta + PIN)
router.use(verificarCajero);

// Consultar saldo actual
router.get('/saldo', CajeroController.consultarSaldo);

// Realizar un retiro
router.post('/retiro', CajeroController.realizarRetiro);

// Consultar los últimos movimientos de la cuenta
router.get('/movimientos', CajeroController.consultarUltimosMovimientos);

module.exports = router;
