const mysql = require('mysql2/promise');



require('dotenv').config();


console.log('🌐 Conectando a TERMINALES DB con:');
console.log({
  host: process.env.DB_HOST_OPTIMA,
  port: process.env.DB_PORT_OPTIMA,
  user: process.env.DB_USER_OPTIMA,
  database: process.env.DB_NAME_OPTIMA,
});


const pool = mysql.createPool({
  host: process.env.DB_HOST_OPTIMA,
  port: process.env.DB_PORT_OPTIMA,
  user: process.env.DB_USER_OPTIMA,
  password: process.env.DB_PASS_OPTIMA,
  database: process.env.DB_NAME_OPTIMA,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool; 