const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const { verificarCliente, verificarAdmin, verificarCajero } = require('../middlewares/auth.middleware');

// Inicio de sesión para Clientes (Banca Virtual) y Administradores
router.post('/login', AuthController.loginUsuario);

// Identificación en el Cajero Automático (Número de cuenta + PIN)
router.post('/cajero', AuthController.loginCajero);

// Consulta de sesión activa
router.get('/me', AuthController.obtenerSesionActual);

// Cierre de sesión
router.post('/logout', AuthController.cerrarSesion);

// Endpoints de verificación de middlewares por rol (Pruebas de Fase 2)
router.get('/verificar-cliente', verificarCliente, (req, res) => {
  res.json({
    ok: true,
    mensaje: 'Middleware verificarCliente superado correctamente.',
    usuario: req.usuario
  });
});

router.get('/verificar-admin', verificarAdmin, (req, res) => {
  res.json({
    ok: true,
    mensaje: 'Middleware verificarAdmin superado correctamente.',
    usuario: req.usuario
  });
});

router.get('/verificar-cajero', verificarCajero, (req, res) => {
  res.json({
    ok: true,
    mensaje: 'Middleware verificarCajero superado correctamente.',
    cuenta: req.cuentaCajero
  });
});

module.exports = router;
