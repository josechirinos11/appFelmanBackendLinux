const express = require('express');
const pool = require('../config/database');

const router = express.Router();

// Ruta pública de prueba
router.get('/db-test', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Verificar estructura de la tabla clientes
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'z_felman2023' 
      AND TABLE_NAME = 'clientes'
    `);

    // Obtener los últimos 10 clientes creados
    const [clientes] = await connection.query(`
      SELECT Codigo, Nombre, FechaAlta
      FROM clientes 
      ORDER BY FechaAlta DESC 
      LIMIT 10
    `);

    connection.release();

    res.json({
      status: 'success',
      message: 'Conexión exitosa a la base de datos',
      data: {
        estructura: columns,
        ultimosClientes: clientes
      }
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router; 