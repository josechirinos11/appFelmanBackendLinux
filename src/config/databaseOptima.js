

// databaseOptima.js
const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER_OPTIMA,     // ej. 'Javier'
  password: process.env.DB_PASS_OPTIMA, // ej. 'javier01'
  server: process.env.DB_HOST_OPTIMA,   // ej. '128.0.0.60'
  port: Number(process.env.DB_PORT_OPTIMA) || 56414,
  database: process.env.DB_NAME_OPTIMA, // ej. 'Felman_2024'
  options: {
    encrypt: false, // pon true si usas SSL
    trustServerCertificate: true
  }
};

const poolPromise = sql.connect(config)
  .then(pool => {
    console.log('✅ Conectado a SQL Server Óptima');
    return pool;
  })
  .catch(err => {
    console.error('❌ Error conectando a SQL Server Óptima', err);
    throw err;
  });

module.exports = { sql, poolPromise };
