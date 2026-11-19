const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const { pool, verificarConexion } = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const cajeroRoutes = require('./routes/cajero.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares para lectura de JSON y formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de sesiones
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'simulador_bancario_secreto_seguro_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 2 // 2 horas
    }
  })
);

// Archivos estáticos del Frontend (Cliente)
app.use(express.static(path.join(__dirname, '../frontend')));

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/cajero', cajeroRoutes);

// Endpoint de verificación de la Fase 1 (Estado del servidor y base de datos)
app.get('/api/health', async (req, res) => {
  try {
    const [usuarios] = await pool.query('SELECT COUNT(*) AS total_usuarios FROM usuarios');
    const [cuentas] = await pool.query('SELECT COUNT(*) AS total_cuentas, SUM(saldo) AS suma_saldos FROM cuentas');
    const [movimientos] = await pool.query('SELECT COUNT(*) AS total_movimientos FROM movimientos');

    res.json({
      ok: true,
      mensaje: 'Fase 1: Servidor Express y Base de Datos MySQL conectados correctamente.',
      resumen_bd: {
        total_usuarios: usuarios[0].total_usuarios,
        total_cuentas: cuentas[0].total_cuentas,
        suma_saldos: cuentas[0].suma_saldos,
        total_movimientos: movimientos[0].total_movimientos
      }
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error al consultar la base de datos MySQL.',
      error: error.message
    });
  }
});

// Inicio del servidor
app.listen(PORT, async () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  try {
    await verificarConexion();
  } catch (error) {
    console.error('❌ No se pudo conectar a MySQL:', error.message);
  }
});
