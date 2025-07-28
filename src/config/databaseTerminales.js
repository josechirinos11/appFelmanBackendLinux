const mysql = require('mysql2/promise');



require('dotenv').config();


console.log('🌐 Conectando a TERMINALES DB con:');
console.log({
  host: process.env.DB_HOST_TERMINALES,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  database: process.env.DB_NAME_TERMINALES,
});


const pool = mysql.createPool({
  host: process.env.DB_HOST_TERMINALES,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME_TERMINALES,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool; 