require('dotenv').config();
const pool = require('./config/database');

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexión exitosa a la base de datos');
    
    // Obtener los últimos 10 clientes creados (solo nombre)
    const [clientes] = await connection.query(`
        SELECT Codigo, Nombre, FechaAlta
        FROM clientes 
        ORDER BY FechaAlta DESC 
        LIMIT 10
      `);
      
    
      console.log('\n📋 Últimos 10 clientes creados:');
      console.table(clientes);


    connection.release();
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

testConnection(); 