const mysql = require('mysql2/promise');
require('dotenv').config();

// Creación del pool de conexiones a MySQL usando variables de entorno (.env)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'simulador_bancario',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/**
 * Prueba la conexión inicial con la base de datos MySQL.
 */
async function verificarConexion() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
    console.log('✅ Conexión exitosa a la base de datos MySQL:', process.env.DB_NAME);
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  verificarConexion
};
