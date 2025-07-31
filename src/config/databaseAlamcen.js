// src/config/databaseAlamcen.js
const mysql = require('mysql2/promise');
require('dotenv').config();

console.log('🌐 Conectando a ALMACÉN DB con:', {
  host:     process.env.DB_HOST_ALMACEN,
  port:     process.env.DB_PORT_ALMACEN,
  user:     process.env.DB_USER_ALMACEN,
  database: process.env.DB_NAME_ALMACEN,
});

const poolAlmacen = mysql.createPool({
  host:               process.env.DB_HOST_ALMACEN,
  port:               parseInt(process.env.DB_PORT_ALMACEN, 10),
  user:               process.env.DB_USER_ALMACEN,
  password:           process.env.DB_PASS_ALMACEN,
  database:           process.env.DB_NAME_ALMACEN,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
});

module.exports = poolAlmacen;